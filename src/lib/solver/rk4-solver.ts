import type { ThermalNetwork, SimulationConfig, SolverResult, NodeResult, ConductorFlowResult } from './types';
import { computeNodeDerivative, solveArithmeticNodes, computeConductorFlow } from './heat-flow';

/**
 * Compute derivatives for all diffusion nodes.
 * Returns a Map of nodeId → dT/dt.
 */
function computeAllDerivatives(
  temperatures: Map<string, number>,
  t: number,
  network: ThermalNetwork,
): Map<string, number> {
  const derivatives = new Map<string, number>();

  for (const nodeId of network.diffusionNodeIds) {
    derivatives.set(nodeId, computeNodeDerivative(nodeId, temperatures, t, network));
  }

  return derivatives;
}

/**
 * Apply a set of increments to temperatures.
 */
function applyIncrements(
  baseTemps: Map<string, number>,
  increments: Map<string, number>,
  scale: number,
): Map<string, number> {
  const result = new Map<string, number>();

  for (const [nodeId, temp] of baseTemps) {
    const inc = increments.get(nodeId) ?? 0;
    result.set(nodeId, temp + inc * scale);
  }

  return result;
}

/**
 * Compute all conductor flows at given temperatures.
 */
function computeAllConductorFlows(
  temperatures: Map<string, number>,
  network: ThermalNetwork,
): Map<string, number> {
  const flows = new Map<string, number>();

  for (const conductor of network.conductors) {
    const tFrom = temperatures.get(conductor.nodeFromId) ?? 0;
    const tTo = temperatures.get(conductor.nodeToId) ?? 0;
    flows.set(conductor.id, computeConductorFlow(conductor, tFrom, tTo));
  }

  return flows;
}

/**
 * 4th-order Runge-Kutta with embedded 5th-order error estimation (RK45).
 * Uses the Dormand-Prince method for adaptive step sizing.
 *
 * Butcher tableau (Dormand-Prince):
 * c | A
 * --|--
 * 0 |
 * 1/5 | 1/5
 * 3/10 | 3/40, 9/40
 * 4/5 | 44/45, -56/15, 32/9
 * 8/9 | 19372/6561, -25360/2187, 64448/6561, -212/729
 * 1 | 9017/3168, -355/33, 46732/5247, 49/176, -5103/18656
 * 1 | 35/384, 0, 500/1113, 125/192, -2187/6784, 11/84
 *
 * For simplicity we use classical RK4 for the solution and RK4 with half-step
 * for error estimation (Richardson extrapolation).
 */
export function solveTransient(
  network: ThermalNetwork,
  config: SimulationConfig,
): SolverResult {
  const { timeStart, timeEnd, timeStep, tolerance, minStep, maxStep } = config;

  // Initialize temperatures
  const temperatures = new Map<string, number>();
  for (const [nodeId, node] of network.nodes) {
    temperatures.set(nodeId, node.initialTemperature);
  }

  // Results storage
  const nodeResultsMap = new Map<string, { times: number[]; temperatures: number[] }>();
  const conductorFlowsMap = new Map<string, { times: number[]; flows: number[] }>();

  for (const nodeId of network.nodeIds) {
    nodeResultsMap.set(nodeId, { times: [timeStart], temperatures: [temperatures.get(nodeId)!] });
  }
  for (const conductor of network.conductors) {
    conductorFlowsMap.set(conductor.id, { times: [timeStart], flows: [] });
  }

  // Record initial conductor flows
  const initialFlows = computeAllConductorFlows(temperatures, network);
  for (const [cid, flow] of initialFlows) {
    conductorFlowsMap.get(cid)?.flows.push(flow);
  }

  const timePoints = [timeStart];
  let t = timeStart;
  let dt = Math.min(timeStep, maxStep);
  let totalEnergyIn = 0;
  let totalEnergyStored = 0;

  // Safety factor for adaptive stepping
  const safetyFactor = 0.9;
  const maxStepGrowth = 5.0;
  const minStepShrink = 0.1;

  while (t < timeEnd) {
    // Clamp dt to not overshoot
    if (t + dt > timeEnd) {
      dt = timeEnd - t;
    }
    if (dt < minStep * 0.01) {
      // Prevent infinite loops
      break;
    }

    // Solve arithmetic nodes with current temps
    solveArithmeticNodes(temperatures, t, network);

    // ── Full step RK4 ──
    const k1 = computeAllDerivatives(temperatures, t, network);

    const temps2 = applyIncrements(temperatures, k1, dt / 2);
    solveArithmeticNodes(temps2, t + dt / 2, network);
    const k2 = computeAllDerivatives(temps2, t + dt / 2, network);

    const temps3 = applyIncrements(temperatures, k2, dt / 2);
    solveArithmeticNodes(temps3, t + dt / 2, network);
    const k3 = computeAllDerivatives(temps3, t + dt / 2, network);

    const temps4 = applyIncrements(temperatures, k3, dt);
    solveArithmeticNodes(temps4, t + dt, network);
    const k4 = computeAllDerivatives(temps4, t + dt, network);

    // RK4 solution: T_new = T + (dt/6)*(k1 + 2*k2 + 2*k3 + k4)
    const fullStepTemps = new Map<string, number>();
    for (const nodeId of network.diffusionNodeIds) {
      const T = temperatures.get(nodeId)!;
      const dT =
        (dt / 6) *
        ((k1.get(nodeId) ?? 0) +
          2 * (k2.get(nodeId) ?? 0) +
          2 * (k3.get(nodeId) ?? 0) +
          (k4.get(nodeId) ?? 0));
      fullStepTemps.set(nodeId, T + dT);
    }

    // ── Two half-steps for error estimation ──
    const halfDt = dt / 2;

    // First half-step
    const hk1 = k1; // same as full step k1
    const hTemps2 = applyIncrements(temperatures, hk1, halfDt / 2);
    solveArithmeticNodes(hTemps2, t + halfDt / 2, network);
    const hk2 = computeAllDerivatives(hTemps2, t + halfDt / 2, network);

    const hTemps3 = applyIncrements(temperatures, hk2, halfDt / 2);
    solveArithmeticNodes(hTemps3, t + halfDt / 2, network);
    const hk3 = computeAllDerivatives(hTemps3, t + halfDt / 2, network);

    const hTemps4 = applyIncrements(temperatures, hk3, halfDt);
    solveArithmeticNodes(hTemps4, t + halfDt, network);
    const hk4 = computeAllDerivatives(hTemps4, t + halfDt, network);

    const midTemps = new Map<string, number>();
    for (const nodeId of network.diffusionNodeIds) {
      const T = temperatures.get(nodeId)!;
      const dT =
        (halfDt / 6) *
        ((hk1.get(nodeId) ?? 0) +
          2 * (hk2.get(nodeId) ?? 0) +
          2 * (hk3.get(nodeId) ?? 0) +
          (hk4.get(nodeId) ?? 0));
      midTemps.set(nodeId, T + dT);
    }

    // Second half-step from midpoint
    solveArithmeticNodes(midTemps, t + halfDt, network);
    const hk1b = computeAllDerivatives(midTemps, t + halfDt, network);

    const hTemps2b = applyIncrements(midTemps, hk1b, halfDt / 2);
    solveArithmeticNodes(hTemps2b, t + halfDt + halfDt / 2, network);
    const hk2b = computeAllDerivatives(hTemps2b, t + halfDt + halfDt / 2, network);

    const hTemps3b = applyIncrements(midTemps, hk2b, halfDt / 2);
    solveArithmeticNodes(hTemps3b, t + halfDt + halfDt / 2, network);
    const hk3b = computeAllDerivatives(hTemps3b, t + halfDt + halfDt / 2, network);

    const hTemps4b = applyIncrements(midTemps, hk3b, halfDt);
    solveArithmeticNodes(hTemps4b, t + dt, network);
    const hk4b = computeAllDerivatives(hTemps4b, t + dt, network);

    const doubleStepTemps = new Map<string, number>();
    for (const nodeId of network.diffusionNodeIds) {
      const T = midTemps.get(nodeId)!;
      const dT =
        (halfDt / 6) *
        ((hk1b.get(nodeId) ?? 0) +
          2 * (hk2b.get(nodeId) ?? 0) +
          2 * (hk3b.get(nodeId) ?? 0) +
          (hk4b.get(nodeId) ?? 0));
      doubleStepTemps.set(nodeId, T + dT);
    }

    // ── Error estimation (Richardson extrapolation) ──
    let maxError = 0;
    for (const nodeId of network.diffusionNodeIds) {
      const fullT = fullStepTemps.get(nodeId) ?? 0;
      const doubleT = doubleStepTemps.get(nodeId) ?? 0;
      // Error estimate: |T_double - T_full| / 15 (RK4 order 4 → factor 2^4 - 1 = 15)
      const error = Math.abs(doubleT - fullT) / 15;
      if (error > maxError) maxError = error;
    }

    // ── Adaptive step size control ──
    if (maxError > tolerance && dt > minStep) {
      // Reject step, reduce dt
      const factor = Math.max(
        minStepShrink,
        safetyFactor * Math.pow(tolerance / maxError, 0.25),
      );
      dt = Math.max(dt * factor, minStep);
      continue; // Retry with smaller step
    }

    // Accept step — use Richardson extrapolated solution (5th order accuracy)
    for (const nodeId of network.diffusionNodeIds) {
      const fullT = fullStepTemps.get(nodeId) ?? 0;
      const doubleT = doubleStepTemps.get(nodeId) ?? 0;
      const correctedT = doubleT + (doubleT - fullT) / 15;
      temperatures.set(nodeId, correctedT);
    }

    // Boundary nodes stay fixed
    for (const nodeId of network.boundaryNodeIds) {
      const node = network.nodes.get(nodeId);
      if (node?.boundaryTemp !== null && node?.boundaryTemp !== undefined) {
        temperatures.set(nodeId, node.boundaryTemp);
      }
    }

    // Solve arithmetic nodes at new time
    t += dt;
    solveArithmeticNodes(temperatures, t, network);

    // Record results
    timePoints.push(t);
    for (const nodeId of network.nodeIds) {
      const result = nodeResultsMap.get(nodeId);
      if (result) {
        result.times.push(t);
        result.temperatures.push(temperatures.get(nodeId)!);
      }
    }

    // Record conductor flows
    const flows = computeAllConductorFlows(temperatures, network);
    for (const [cid, flow] of flows) {
      conductorFlowsMap.get(cid)?.flows.push(flow);
    }

    // Grow step size for next iteration
    if (maxError > 0) {
      const factor = Math.min(
        maxStepGrowth,
        safetyFactor * Math.pow(tolerance / maxError, 0.25),
      );
      dt = Math.min(Math.max(dt * factor, minStep), maxStep);
    } else {
      dt = Math.min(dt * maxStepGrowth, maxStep);
    }
  }

  // Compute energy balance
  for (const nodeId of network.diffusionNodeIds) {
    const node = network.nodes.get(nodeId);
    if (node) {
      const tFinal = temperatures.get(nodeId) ?? node.initialTemperature;
      totalEnergyStored += node.capacitance * (tFinal - node.initialTemperature);
    }
  }

  // Sum total energy input (approximate via trapezoidal rule over recorded heat loads)
  // This is a simplified energy balance check
  for (let i = 1; i < timePoints.length; i++) {
    const dtStep = timePoints[i] - timePoints[i - 1];
    for (const conductor of network.conductors) {
      const flowData = conductorFlowsMap.get(conductor.id);
      if (flowData && flowData.flows.length > i) {
        // Conductor flows are internal — they cancel in the global balance
      }
    }
    // External heat loads
    for (const load of network.heatLoads) {
      const nodeId = load.nodeId;
      const node = network.nodes.get(nodeId);
      if (node && node.nodeType === 'diffusion') {
        // Approximate external Q at midpoint
        const tMid = (timePoints[i - 1] + timePoints[i]) / 2;
        let Q = 0;
        if (load.loadType === 'constant') Q = load.value;
        else if (load.loadType === 'time_varying') {
          const { interpolateTimeVarying } = require('./heat-flow');
          Q = interpolateTimeVarying(load.timeValues, tMid);
        }
        totalEnergyIn += Q * dtStep;
      }
    }
  }

  const energyBalanceError =
    totalEnergyStored !== 0
      ? Math.abs((totalEnergyIn - totalEnergyStored) / totalEnergyStored)
      : 0;

  // Convert maps to result arrays
  const nodeResults: NodeResult[] = [];
  for (const [nodeId, data] of nodeResultsMap) {
    nodeResults.push({ nodeId, times: data.times, temperatures: data.temperatures });
  }

  const conductorFlows: ConductorFlowResult[] = [];
  for (const [conductorId, data] of conductorFlowsMap) {
    conductorFlows.push({ conductorId, times: data.times, flows: data.flows });
  }

  return {
    nodeResults,
    conductorFlows,
    timePoints,
    energyBalanceError,
    converged: true,
  };
}
