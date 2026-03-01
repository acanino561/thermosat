import {
  STEFAN_BOLTZMANN,
  type SolverConductor,
  type SolverHeatLoad,
  type SolverNode,
  type ThermalNetwork,
  type TimeValuePair,
} from './types';
import { computeHeatPipeFlow, interpolateGeff } from './heat-pipe';

/**
 * Compute linear conduction heat flow from nodeFrom to nodeTo.
 * Q = G * (T_from - T_to)
 * Positive flow = heat flows from -> to (from is hotter)
 */
export function computeLinearConductionFlow(
  conductor: SolverConductor,
  tFrom: number,
  tTo: number,
): number {
  return conductor.conductance * (tFrom - tTo);
}

/**
 * Compute radiation heat flow from nodeFrom to nodeTo.
 * Q = σ * ε * A * F * (T_from⁴ - T_to⁴)
 * Positive flow = heat flows from -> to (from is hotter)
 */
export function computeRadiationFlow(
  conductor: SolverConductor,
  tFrom: number,
  tTo: number,
): number {
  return (
    STEFAN_BOLTZMANN *
    conductor.emissivity *
    conductor.area *
    conductor.viewFactor *
    (Math.pow(tFrom, 4) - Math.pow(tTo, 4))
  );
}

/**
 * Compute contact conductance heat flow.
 * Same as linear: Q = G_contact * (T_from - T_to)
 */
export function computeContactFlow(
  conductor: SolverConductor,
  tFrom: number,
  tTo: number,
): number {
  return conductor.conductance * (tFrom - tTo);
}

/**
 * Compute total heat flow through a conductor given temperatures.
 */
export function computeConductorFlow(
  conductor: SolverConductor,
  tFrom: number,
  tTo: number,
): number {
  switch (conductor.conductorType) {
    case 'linear':
      return computeLinearConductionFlow(conductor, tFrom, tTo);
    case 'radiation':
      return computeRadiationFlow(conductor, tFrom, tTo);
    case 'contact':
      return computeContactFlow(conductor, tFrom, tTo);
    case 'heat_pipe':
      return computeHeatPipeFlow(
        conductor.conductanceData?.points ?? null,
        tFrom,
        tTo,
      );
  }
}

/**
 * Interpolate a piecewise-linear time-varying heat load at time t.
 */
export function interpolateTimeVarying(
  timeValues: TimeValuePair[],
  t: number,
): number {
  if (timeValues.length === 0) return 0;
  if (t <= timeValues[0].time) return timeValues[0].value;
  if (t >= timeValues[timeValues.length - 1].time) {
    return timeValues[timeValues.length - 1].value;
  }

  // Binary search for the interval
  let lo = 0;
  let hi = timeValues.length - 1;
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    if (timeValues[mid].time <= t) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  const t0 = timeValues[lo].time;
  const t1 = timeValues[hi].time;
  const v0 = timeValues[lo].value;
  const v1 = timeValues[hi].value;
  const frac = (t - t0) / (t1 - t0);
  return v0 + frac * (v1 - v0);
}

/**
 * Compute external heat load on a node at time t.
 * Sums all heat loads applied to the node.
 */
export function computeNodeHeatLoad(
  nodeId: string,
  heatLoads: SolverHeatLoad[],
  t: number,
  network: ThermalNetwork,
): number {
  let totalQ = 0;

  // Use pre-indexed heat loads when available, otherwise fall back to full scan
  const nodeLoads = network.nodeHeatLoads?.get(nodeId) ?? heatLoads.filter(l => l.nodeId === nodeId);

  for (const load of nodeLoads) {

    switch (load.loadType) {
      case 'constant':
        totalQ += load.value;
        break;

      case 'time_varying':
        totalQ += interpolateTimeVarying(load.timeValues, t);
        break;

      case 'orbital':
        totalQ += computeOrbitalHeatLoad(load, t, network);
        break;
    }
  }

  return totalQ;
}

/**
 * Compute orbital-dependent heat load at time t.
 * Uses the orbital profile from the network to determine solar/albedo/IR flux.
 */
function computeOrbitalHeatLoad(
  load: SolverHeatLoad,
  t: number,
  network: ThermalNetwork,
): number {
  if (!load.orbitalParams || !network.orbitalProfile || !network.orbitalEnv) {
    return 0;
  }

  const params = load.orbitalParams;
  const profile = network.orbitalProfile;
  const period = network.orbitalEnv.orbitalPeriod;

  // Map t to position within the orbital period
  const orbitTime = ((t % period) + period) % period;

  // Find the profile index (interpolate)
  const profileLength = profile.times.length;
  if (profileLength === 0) return 0;

  // Find bracketing indices
  let idx = 0;
  for (let i = 0; i < profileLength - 1; i++) {
    if (profile.times[i] <= orbitTime && profile.times[i + 1] > orbitTime) {
      idx = i;
      break;
    }
    if (i === profileLength - 2) {
      idx = i;
    }
  }

  // Simple nearest-neighbor for boolean (sunlight)
  const inSunlight = profile.inSunlight[idx];

  // Interpolate flux values
  const frac =
    profileLength > 1 && idx < profileLength - 1
      ? (orbitTime - profile.times[idx]) /
        (profile.times[idx + 1] - profile.times[idx])
      : 0;

  const solarFlux =
    profile.solarFlux[idx] +
    frac *
      ((idx < profileLength - 1 ? profile.solarFlux[idx + 1] : profile.solarFlux[idx]) -
        profile.solarFlux[idx]);

  const albedoFlux =
    profile.albedoFlux[idx] +
    frac *
      ((idx < profileLength - 1 ? profile.albedoFlux[idx + 1] : profile.albedoFlux[idx]) -
        profile.albedoFlux[idx]);

  const earthIRFlux =
    profile.earthIR[idx] +
    frac *
      ((idx < profileLength - 1 ? profile.earthIR[idx + 1] : profile.earthIR[idx]) -
        profile.earthIR[idx]);

  let Q = 0;

  switch (params.surfaceType) {
    case 'solar':
      // Receives solar and albedo when sunlit, Earth IR always
      if (inSunlight) {
        Q += params.absorptivity * solarFlux * params.area;
        Q += params.absorptivity * albedoFlux * params.area;
      }
      Q += params.emissivity * earthIRFlux * params.area;
      // Radiation to space
      break;

    case 'earth_facing':
      // Receives albedo when sunlit and Earth IR always
      if (inSunlight) {
        Q += params.absorptivity * albedoFlux * params.area;
      }
      Q += params.emissivity * earthIRFlux * params.area;
      break;

    case 'anti_earth':
      // Receives solar when sunlit, no Earth flux
      if (inSunlight) {
        Q += params.absorptivity * solarFlux * params.area;
      }
      break;

    case 'custom':
      // Apply all fluxes
      if (inSunlight) {
        Q += params.absorptivity * solarFlux * params.area;
        Q += params.absorptivity * albedoFlux * params.area;
      }
      Q += params.emissivity * earthIRFlux * params.area;
      break;
  }

  return Q;
}

/**
 * Compute the total heat flow into a node from all conductors.
 * Uses pre-built adjacency list for O(degree) instead of O(C).
 */
export function computeTotalConductorHeatFlow(
  nodeId: string,
  temperatures: Map<string, number>,
  network: ThermalNetwork,
): number {
  let totalQ = 0;

  const entries = network.nodeConductors.get(nodeId);
  if (!entries) return 0;

  for (const entry of entries) {
    const { conductor, sign } = entry;
    const tFrom = temperatures.get(conductor.nodeFromId);
    const tTo = temperatures.get(conductor.nodeToId);
    if (tFrom === undefined || tTo === undefined) continue;

    // sign is +1 for "to" node (heat flows in), -1 for "from" node (heat flows out)
    totalQ += sign * computeConductorFlow(conductor, tFrom, tTo);
  }

  return totalQ;
}

/**
 * Compute dT/dt for a diffusion node.
 * C * dT/dt = Σ conductor_flows + Σ external_loads
 */
export function computeNodeDerivative(
  nodeId: string,
  temperatures: Map<string, number>,
  t: number,
  network: ThermalNetwork,
): number {
  const node = network.nodes.get(nodeId);
  if (!node || node.nodeType !== 'diffusion') return 0;
  if (node.capacitance <= 0) return 0;

  const conductorHeat = computeTotalConductorHeatFlow(
    nodeId,
    temperatures,
    network,
  );
  const externalHeat = computeNodeHeatLoad(
    nodeId,
    network.heatLoads,
    t,
    network,
  );

  return (conductorHeat + externalHeat) / node.capacitance;
}

/**
 * Solve for arithmetic node temperatures (instant equilibrium, no thermal mass).
 * For each arithmetic node: sum of all heat flows = 0
 * Uses iterative Gauss-Seidel approach.
 */
export function solveArithmeticNodes(
  temperatures: Map<string, number>,
  t: number,
  network: ThermalNetwork,
  maxIter: number = 100,
  tolerance: number = 1e-4,
): void {
  for (let iter = 0; iter < maxIter; iter++) {
    let maxChange = 0;

    for (const nodeId of network.arithmeticNodeIds) {
      const node = network.nodes.get(nodeId);
      if (!node) continue;

      // Sum conductances and weighted temperatures
      let sumG = 0;
      let sumGT = 0;
      let sumRadNumerator = 0;
      let sumRadDenominator = 0;

      const entries = network.nodeConductors?.get(nodeId) ?? [];
      for (const entry of entries) {
        const conductor = entry.conductor;
        const otherNodeId = entry.otherNodeId;
        const tOther = temperatures.get(otherNodeId);
        if (tOther === undefined) continue;

        if (conductor.conductorType === 'radiation') {
          // Radiation: need to linearize
          const tNode = temperatures.get(nodeId) ?? 293;
          const tAvg = (tNode + tOther) / 2;
          const radG =
            4 *
            STEFAN_BOLTZMANN *
            conductor.emissivity *
            conductor.area *
            conductor.viewFactor *
            Math.pow(tAvg, 3);
          sumRadNumerator += radG * tOther;
          sumRadDenominator += radG;
        } else if (conductor.conductorType === 'heat_pipe') {
          // Heat pipe: temperature-dependent conductance
          const tNode = temperatures.get(nodeId) ?? 293;
          const tAvgHp = (tNode + tOther) / 2;
          const gEff = interpolateGeff(conductor.conductanceData?.points ?? null, tAvgHp);
          sumG += gEff;
          sumGT += gEff * tOther;
        } else {
          // Linear or contact
          sumG += conductor.conductance;
          sumGT += conductor.conductance * tOther;
        }
      }

      // Add external heat loads
      const Q = computeNodeHeatLoad(nodeId, network.heatLoads, t, network);

      const totalG = sumG + sumRadDenominator;
      if (totalG === 0) continue;

      const newTemp = (sumGT + sumRadNumerator + Q) / totalG;
      const oldTemp = temperatures.get(nodeId) ?? 293;
      const change = Math.abs(newTemp - oldTemp);
      if (change > maxChange) maxChange = change;

      temperatures.set(nodeId, newTemp);
    }

    if (maxChange < tolerance) break;
  }
}
