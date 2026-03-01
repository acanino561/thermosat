/**
 * Failure Mode Engine
 *
 * Applies failure scenarios to a thermal model by deep-copying and modifying
 * model data (nodes, conductors, heatLoads). Never mutates the originals.
 */

import type {
  SolverNode,
  SolverConductor,
  SolverHeatLoad,
  OrbitalHeatLoadParams,
} from './types';

export type FailureType =
  | 'heater_failure'
  | 'mli_degradation'
  | 'coating_degradation_eol'
  | 'attitude_loss_tumble'
  | 'power_budget_reduction'
  | 'conductor_failure'
  | 'component_power_spike';

export interface FailureModeParams {
  heatLoadId?: string;
  degradationFactor?: number;
  absorbanceDelta?: number;
  powerScaleFactor?: number;
  conductorId?: string;
  nodeId?: string;
  spikeFactor?: number;
}

interface ModelData {
  nodes: SolverNode[];
  conductors: SolverConductor[];
  heatLoads: SolverHeatLoad[];
}

function deepCopyModel(data: ModelData): ModelData {
  return JSON.parse(JSON.stringify(data));
}

export function applyFailureMode(
  failureType: FailureType,
  nodes: SolverNode[],
  conductors: SolverConductor[],
  heatLoads: SolverHeatLoad[],
  params: FailureModeParams,
): ModelData {
  const model = deepCopyModel({ nodes, conductors, heatLoads });

  switch (failureType) {
    case 'heater_failure':
      return applyHeaterFailure(model, params);
    case 'mli_degradation':
      return applyMliDegradation(model, params);
    case 'coating_degradation_eol':
      return applyCoatingDegradation(model, params);
    case 'attitude_loss_tumble':
      return applyAttitudeLossTumble(model);
    case 'power_budget_reduction':
      return applyPowerBudgetReduction(model, params);
    case 'conductor_failure':
      return applyConductorFailure(model, params);
    case 'component_power_spike':
      return applyComponentPowerSpike(model, params);
    default:
      return model;
  }
}

function applyHeaterFailure(model: ModelData, params: FailureModeParams): ModelData {
  const { heatLoadId } = params;
  if (!heatLoadId) return model;

  for (const load of model.heatLoads) {
    if (load.id === heatLoadId) {
      load.value = 0;
      if (load.timeValues && load.timeValues.length > 0) {
        load.timeValues = load.timeValues.map((tv) => ({ time: tv.time, value: 0 }));
      }
    }
  }
  return model;
}

function applyMliDegradation(model: ModelData, params: FailureModeParams): ModelData {
  const factor = params.degradationFactor ?? 5;

  for (const node of model.nodes) {
    // MLI surfaces typically have very low emissivity (< 0.1)
    if (node.emissivity < 0.1) {
      node.emissivity = Math.min(node.emissivity * factor, 0.99);
    }
  }
  return model;
}

function applyCoatingDegradation(model: ModelData, params: FailureModeParams): ModelData {
  const delta = params.absorbanceDelta ?? 0.05;

  // Find nodes that have orbital heat loads (surface nodes)
  const orbitalNodeIds = new Set(
    model.heatLoads
      .filter((hl) => hl.loadType === 'orbital' && hl.orbitalParams)
      .map((hl) => hl.nodeId),
  );

  for (const node of model.nodes) {
    if (orbitalNodeIds.has(node.id)) {
      node.absorptivity = Math.min((node.absorptivity || 0) + delta, 0.99);
    }
  }

  // Also update absorptivity in orbital params
  for (const load of model.heatLoads) {
    if (load.loadType === 'orbital' && load.orbitalParams) {
      load.orbitalParams.absorptivity = Math.min(
        load.orbitalParams.absorptivity + delta,
        0.99,
      );
    }
  }

  return model;
}

function applyAttitudeLossTumble(model: ModelData): ModelData {
  for (const load of model.heatLoads) {
    if (load.loadType === 'orbital' && load.orbitalParams) {
      load.orbitalParams.surfaceType = 'custom';
      // Averaging over 6 faces for tumble — divide absorptivity by 6
      load.orbitalParams.absorptivity = load.orbitalParams.absorptivity / 6;
    }
  }
  return model;
}

function applyPowerBudgetReduction(model: ModelData, params: FailureModeParams): ModelData {
  const scale = params.powerScaleFactor ?? 0.5;

  for (const load of model.heatLoads) {
    if (load.loadType === 'constant' && load.value != null) {
      load.value = Math.max(load.value * scale, 0);
    }
    if (load.loadType === 'time_varying' && load.timeValues) {
      load.timeValues = load.timeValues.map((tv) => ({
        time: tv.time,
        value: Math.max(tv.value * scale, 0),
      }));
    }
  }
  return model;
}

function applyConductorFailure(model: ModelData, params: FailureModeParams): ModelData {
  const { conductorId } = params;
  if (!conductorId) return model;

  for (const cond of model.conductors) {
    if (cond.id === conductorId) {
      cond.conductance = 0;
    }
  }
  return model;
}

function applyComponentPowerSpike(model: ModelData, params: FailureModeParams): ModelData {
  const { nodeId, spikeFactor = 2.0 } = params;
  if (!nodeId) return model;

  for (const load of model.heatLoads) {
    if (load.nodeId === nodeId) {
      if (load.value != null) {
        load.value = load.value * spikeFactor;
      }
      if (load.timeValues) {
        load.timeValues = load.timeValues.map((tv) => ({
          time: tv.time,
          value: tv.value * spikeFactor,
        }));
      }
    }
  }
  return model;
}
