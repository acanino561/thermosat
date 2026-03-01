/**
 * Design Space Explorer — Latin Hypercube Sampling & parameter application
 */

// ── Interfaces ──────────────────────────────────────────────────────────────

export interface ExplorationParameter {
  entityType: 'node' | 'conductor' | 'heat_load';
  entityId: string;
  property: string;
  minValue: number;
  maxValue: number;
  numLevels: number;
}

export interface ExplorationConstraint {
  nodeId: string;
  tempMin?: number;
  tempMax?: number;
}

export interface ExplorationConfig {
  parameters: ExplorationParameter[];
  constraints: ExplorationConstraint[];
  numSamples: number;
  samplingMethod: 'lhs' | 'random';
}

export interface NodeResult {
  nodeId: string;
  nodeName: string;
  minTemp: number;
  maxTemp: number;
  meanTemp: number;
}

export interface ExplorationSampleResult {
  sampleIndex: number;
  paramValues: Record<string, number>;
  nodeResults: NodeResult[];
  feasible: boolean;
}

// ── Helper: parameter key ───────────────────────────────────────────────────

function paramKey(p: ExplorationParameter): string {
  return `${p.entityType}_${p.entityId}_${p.property}`;
}

// ── Latin Hypercube Sampling ────────────────────────────────────────────────

/**
 * Generate LHS samples. For each parameter, divides [min, max] into numSamples
 * strata, picks a random point in each stratum, then randomly permutes.
 */
export function latinHypercubeSample(
  parameters: ExplorationParameter[],
  numSamples: number,
): Record<string, number>[] {
  // For each parameter, create shuffled strata
  const paramSamples = new Map<string, number[]>();

  for (const param of parameters) {
    const key = paramKey(param);
    const range = param.maxValue - param.minValue;
    const strataSize = range / numSamples;

    // Generate one random point per stratum
    const values: number[] = [];
    for (let i = 0; i < numSamples; i++) {
      const lower = param.minValue + i * strataSize;
      values.push(lower + Math.random() * strataSize);
    }

    // Fisher-Yates shuffle
    for (let i = values.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [values[i], values[j]] = [values[j], values[i]];
    }

    paramSamples.set(key, values);
  }

  // Assemble into array of sample objects
  const samples: Record<string, number>[] = [];
  for (let i = 0; i < numSamples; i++) {
    const sample: Record<string, number> = {};
    for (const param of parameters) {
      const key = paramKey(param);
      sample[key] = paramSamples.get(key)![i];
    }
    samples.push(sample);
  }

  return samples;
}

/**
 * Generate random (non-LHS) samples.
 */
export function randomSample(
  parameters: ExplorationParameter[],
  numSamples: number,
): Record<string, number>[] {
  const samples: Record<string, number>[] = [];
  for (let i = 0; i < numSamples; i++) {
    const sample: Record<string, number> = {};
    for (const param of parameters) {
      const key = paramKey(param);
      sample[key] = param.minValue + Math.random() * (param.maxValue - param.minValue);
    }
    samples.push(sample);
  }
  return samples;
}

// ── Apply Parameter Sample ──────────────────────────────────────────────────

interface DbNodeLike {
  id: string;
  [key: string]: unknown;
}

interface DbConductorLike {
  id: string;
  [key: string]: unknown;
}

interface DbHeatLoadLike {
  id: string;
  [key: string]: unknown;
}

const NODE_PROPERTIES = new Set([
  'absorptivity', 'emissivity', 'area', 'mass', 'capacitance', 'temperature',
]);
const CONDUCTOR_PROPERTIES = new Set([
  'conductance', 'viewFactor', 'emissivity',
]);
const HEAT_LOAD_PROPERTIES = new Set(['value']);

/**
 * Apply a parameter sample to model data, returning deep copies.
 * Never mutates originals.
 */
export function applyParameterSample<
  N extends DbNodeLike,
  C extends DbConductorLike,
  H extends DbHeatLoadLike,
>(
  nodes: N[],
  conductorsList: C[],
  heatLoadsList: H[],
  parameters: ExplorationParameter[],
  sample: Record<string, number>,
): { nodes: N[]; conductors: C[]; heatLoads: H[] } {
  // Deep copy
  const newNodes: N[] = JSON.parse(JSON.stringify(nodes));
  const newConductors: C[] = JSON.parse(JSON.stringify(conductorsList));
  const newHeatLoads: H[] = JSON.parse(JSON.stringify(heatLoadsList));

  for (const param of parameters) {
    const key = paramKey(param);
    const value = sample[key];
    if (value === undefined) continue;

    if (param.entityType === 'node' && NODE_PROPERTIES.has(param.property)) {
      const node = newNodes.find((n) => n.id === param.entityId);
      if (node) (node as Record<string, unknown>)[param.property] = value;
    } else if (param.entityType === 'conductor' && CONDUCTOR_PROPERTIES.has(param.property)) {
      const cond = newConductors.find((c) => c.id === param.entityId);
      if (cond) (cond as Record<string, unknown>)[param.property] = value;
    } else if (param.entityType === 'heat_load' && HEAT_LOAD_PROPERTIES.has(param.property)) {
      const hl = newHeatLoads.find((h) => h.id === param.entityId);
      if (hl) (hl as Record<string, unknown>)[param.property] = value;
    }
  }

  return { nodes: newNodes, conductors: newConductors, heatLoads: newHeatLoads };
}

// ── Feasibility Check ───────────────────────────────────────────────────────

/**
 * Check if all constraints are satisfied by node results.
 */
export function checkFeasibility(
  nodeResults: NodeResult[],
  constraints: ExplorationConstraint[],
): boolean {
  if (constraints.length === 0) return true;

  for (const constraint of constraints) {
    const nr = nodeResults.find((r) => r.nodeId === constraint.nodeId);
    if (!nr) continue; // node not in results — skip

    if (constraint.tempMax !== undefined && nr.maxTemp > constraint.tempMax) {
      return false;
    }
    if (constraint.tempMin !== undefined && nr.minTemp < constraint.tempMin) {
      return false;
    }
  }

  return true;
}

/**
 * Extract per-node summary (min/max/mean) from solver time-series results.
 */
export function extractNodeResults(
  solverResults: Array<{ nodeId: string; times: number[]; temperatures: number[] }>,
  nodeNameMap: Map<string, string>,
): NodeResult[] {
  return solverResults.map((r) => {
    const temps = r.temperatures;
    let min = Infinity;
    let max = -Infinity;
    let sum = 0;
    for (const t of temps) {
      if (t < min) min = t;
      if (t > max) max = t;
      sum += t;
    }
    return {
      nodeId: r.nodeId,
      nodeName: nodeNameMap.get(r.nodeId) ?? r.nodeId,
      minTemp: min,
      maxTemp: max,
      meanTemp: temps.length > 0 ? sum / temps.length : 0,
    };
  });
}
