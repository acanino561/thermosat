// ─── What-If Sensitivity Calculation ─────────────────────────────────────────
// Client-side ΔT computation using the linear sensitivity matrix from Task 6.1.

export interface SensitivityEntry {
  parameterId: string;
  parameterType: 'node_property' | 'conductor' | 'heat_load';
  parameterLabel: string;
  entityId: string;
  nodeId: string;
  dT_dp: number;
  secondOrderEstimate: number;
  baselineValue: number;
  nodeName?: string;
}

export interface SensitivityData {
  status: 'pending' | 'running' | 'complete' | 'failed' | 'not_available';
  computedAt: string | null;
  entries: SensitivityEntry[];
  errorMessage?: string;
}

export interface WhatIfState {
  enabled: boolean;
  deltas: Record<string, number>; // parameterId → Δp
}

/**
 * Compute What-If temperatures using linear sensitivity approximation.
 * T_whatif(node) = T_baseline(node) + Σ_i (dT_dp_i × Δp_i) for entries targeting that node.
 *
 * Performance: O(entries × nodes) — well under 100ms for 50 params × 20 nodes.
 */
export function computeWhatIfTemps(
  baseline: Record<string, number>,
  entries: SensitivityEntry[],
  deltas: Record<string, number>,
): Record<string, number> {
  const result: Record<string, number> = {};

  // Pre-compute per-node ΔT contributions
  const nodeDeltaT: Record<string, number> = {};
  for (const entry of entries) {
    const dp = deltas[entry.parameterId];
    if (!dp) continue;
    nodeDeltaT[entry.nodeId] = (nodeDeltaT[entry.nodeId] ?? 0) + entry.dT_dp * dp;
  }

  for (const nodeId of Object.keys(baseline)) {
    result[nodeId] = baseline[nodeId] + (nodeDeltaT[nodeId] ?? 0);
  }

  return result;
}

/**
 * Compute per-node ΔT map for display purposes.
 */
export function computeDeltaTs(
  entries: SensitivityEntry[],
  deltas: Record<string, number>,
): Record<string, number> {
  const nodeDeltaT: Record<string, number> = {};
  for (const entry of entries) {
    const dp = deltas[entry.parameterId];
    if (!dp) continue;
    nodeDeltaT[entry.nodeId] = (nodeDeltaT[entry.nodeId] ?? 0) + entry.dT_dp * dp;
  }
  return nodeDeltaT;
}

/**
 * Compute accuracy confidence score (0–100) based on second-order estimates.
 * Returns 100 when all deltas are zero; decreases as nonlinearity increases.
 */
export function computeAccuracyScore(
  entries: SensitivityEntry[],
  deltas: Record<string, number>,
): number {
  let maxNonlinearity = 0;

  for (const entry of entries) {
    const dp = deltas[entry.parameterId];
    if (!dp || Math.abs(entry.dT_dp * dp) < 1e-12) continue;

    const firstOrder = Math.abs(entry.dT_dp * dp);
    const secondOrder = Math.abs(entry.secondOrderEstimate * dp * dp);
    const ratio = secondOrder / firstOrder;
    maxNonlinearity = Math.max(maxNonlinearity, ratio);
  }

  // Clamp to 0–100
  return Math.max(0, Math.round(100 - maxNonlinearity * 100));
}

/**
 * Get per-parameter accuracy indicator based on change magnitude.
 */
export function getParameterAccuracy(
  entry: SensitivityEntry,
  delta: number,
  baselineValue: number,
): 'green' | 'yellow' | 'red' {
  if (Math.abs(delta) < 1e-12) return 'green';

  const changePct = Math.abs(delta / (baselineValue || 1)) * 100;

  // Check nonlinearity ratio
  if (Math.abs(entry.dT_dp * delta) > 1e-12) {
    const ratio = Math.abs(entry.secondOrderEstimate * delta * delta) / Math.abs(entry.dT_dp * delta);
    if (ratio > 0.2) return 'red';
  }

  if (changePct > 30) return 'red';
  if (changePct > 10) return 'yellow';
  return 'green';
}

/**
 * Infer unit suffix from parameter type / id.
 */
export function getParameterUnit(parameterId: string, parameterType: string): string {
  if (parameterType === 'heat_load') return 'W';
  if (parameterType === 'conductor') {
    if (parameterId.includes('viewfactor')) return '';
    return 'W/K';
  }
  // node_property
  if (parameterId.includes('absorptivity')) return '';
  if (parameterId.includes('emissivity')) return '';
  if (parameterId.includes('capacitance')) return 'J/K';
  if (parameterId.includes('mass')) return 'kg';
  return '';
}

/**
 * Compute parameter range for slider bounds using actual baseline value.
 * Returns ±50% around the real baseline, with type-specific clamping.
 */
export function getParameterRange(
  entry: SensitivityEntry,
): { min: number; max: number; baseline: number; step: number } {
  const { parameterId, parameterType, baselineValue } = entry;
  let min = baselineValue * 0.5;
  let max = baselineValue * 1.5;

  // Absorptivity / emissivity: clamp to [0.01, 1.0]
  if (parameterId.includes('absorptivity') || parameterId.includes('emissivity')) {
    min = Math.max(0.01, min);
    max = Math.min(1.0, max);
    const range = max - min;
    return { min, max, baseline: baselineValue, step: range > 0 ? range / 100 : 0.01 };
  }
  // Mass: clamp min
  if (parameterId.includes('mass')) {
    min = Math.max(0.001, min);
    const range = max - min;
    return { min, max, baseline: baselineValue, step: range > 0 ? range / 100 : 0.1 };
  }
  // Capacitance: clamp min
  if (parameterId.includes('capacitance')) {
    min = Math.max(0.001, min);
    const range = max - min;
    return { min, max, baseline: baselineValue, step: range > 0 ? range / 100 : 1 };
  }
  // Conductance: always positive
  if (parameterType === 'conductor') {
    min = Math.max(0, min);
    const range = max - min;
    return { min, max, baseline: baselineValue, step: range > 0 ? range / 100 : 0.1 };
  }
  // Heat load: can be negative
  if (parameterType === 'heat_load') {
    const range = max - min;
    return { min, max, baseline: baselineValue, step: range > 0 ? range / 100 : 0.5 };
  }
  // Fallback
  const range = max - min;
  return { min, max, baseline: baselineValue, step: range > 0 ? range / 100 : 0.01 };
}
