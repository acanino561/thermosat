import type {
  ThermalNetwork,
  SimulationConfig,
  SolverResult,
  NodeResult,
  ConductorFlowResult,
  SolverConductor,
} from './types';
import { STEFAN_BOLTZMANN } from './types';
import {
  computeTotalConductorHeatFlow,
  computeNodeHeatLoad,
  solveArithmeticNodes,
  computeConductorFlow,
  interpolateTimeVarying,
} from './heat-flow';
import { interpolateGeff } from './heat-pipe';

/**
 * Compute the diagonal Jacobian entry dF_i/dT_i for node i.
 *
 * F_i(T) = C_i * (T_i - T_n_i) / dt - Q_net_i(T)
 * dF_i/dT_i = C_i / dt - dQ_net_i/dT_i
 *
 * dQ_net_i/dT_i is the sum of partial derivatives from all conductors
 * connected to node i, with respect to T_i.
 */
function computeDiagonalJacobian(
  nodeId: string,
  temperatures: Map<string, number>,
  network: ThermalNetwork,
  capacitance: number,
  dt: number,
): number {
  let dQdT = 0;
  const tNode = temperatures.get(nodeId)!;

  for (const conductor of network.conductors) {
    const isFrom = conductor.nodeFromId === nodeId;
    const isTo = conductor.nodeToId === nodeId;
    if (!isFrom && !isTo) continue;

    const otherNodeId = isFrom ? conductor.nodeToId : conductor.nodeFromId;
    const tOther = temperatures.get(otherNodeId);
    if (tOther === undefined) continue;

    // Sign convention: if nodeId is "from", heat flows OUT (negative contribution to Q_net)
    // computeTotalConductorHeatFlow subtracts flow when node is "from", adds when "to"
    // So dQ_net/dT_i has a sign that depends on direction.

    let dFlow_dTi: number;

    switch (conductor.conductorType) {
      case 'linear':
      case 'contact':
        // Q = G * (T_from - T_to)
        // If nodeId is from: dQ/dT_from = G, but Q_net subtracts → dQ_net/dT_i = -G
        // If nodeId is to: dQ/dT_to = -G, but Q_net adds → dQ_net/dT_i = -G
        dFlow_dTi = -conductor.conductance;
        break;

      case 'radiation':
        // Q = σεAF(T_from⁴ - T_to⁴)
        // dQ/dT_from = 4σεAF * T_from³
        // If nodeId is from: Q_net subtracts → dQ_net/dT_i = -4σεAF * T_i³
        // If nodeId is to: dQ/dT_to = -4σεAF * T_to³, Q_net adds → dQ_net/dT_i = -4σεAF * T_i³
        dFlow_dTi =
          -4 *
          STEFAN_BOLTZMANN *
          conductor.emissivity *
          conductor.area *
          conductor.viewFactor *
          Math.pow(tNode, 3);
        break;

      case 'heat_pipe': {
        // Q = G_eff(T_avg) * (T_from - T_to)
        // Frozen Jacobian: treat G_eff as constant at current T_avg
        const tAvg = (tNode + tOther) / 2;
        const gEff = interpolateGeff(
          conductor.conductanceData?.points ?? null,
          tAvg,
        );
        dFlow_dTi = -gEff;
        break;
      }
    }

    dQdT += dFlow_dTi;
  }

  // J_ii = C_i / dt - dQ_net_i/dT_i
  return capacitance / dt - dQdT;
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
 * Implicit Euler (Backward Euler) transient solver.
 *
 * Solves C * (T_{n+1} - T_n) / dt = Q_net(T_{n+1}) using Newton-Raphson
 * with a diagonal Jacobian approximation at each timestep.
 *
 * Adaptive timestep based on Newton iteration count:
 * - ≤3 iterations → double dt next step
 * - 7-10 iterations → halve dt next step
 * - >10 iterations (no convergence) → halve dt, retry
 */
export function solveImplicitEuler(
  network: ThermalNetwork,
  config: SimulationConfig,
): SolverResult {
  const { timeStart, timeEnd, timeStep, tolerance, minStep, maxStep } = config;

  const MAX_NEWTON_ITER = 10;
  const NEWTON_TOL = 1e-4; // K convergence criterion

  // Initialize temperatures
  const temperatures = new Map<string, number>();
  for (const [nodeId, node] of network.nodes) {
    temperatures.set(nodeId, node.initialTemperature);
  }

  // Results storage
  const nodeResultsMap = new Map<
    string,
    { times: number[]; temperatures: number[] }
  >();
  const conductorFlowsMap = new Map<
    string,
    { times: number[]; flows: number[] }
  >();

  for (const nodeId of network.nodeIds) {
    nodeResultsMap.set(nodeId, {
      times: [timeStart],
      temperatures: [temperatures.get(nodeId)!],
    });
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

  while (t < timeEnd) {
    // Clamp dt to not overshoot
    if (t + dt > timeEnd) {
      dt = timeEnd - t;
    }
    if (dt < minStep * 0.01) {
      break; // Prevent infinite loops
    }

    // Solve arithmetic nodes with current temps
    solveArithmeticNodes(temperatures, t, network);

    // Save T_n for this timestep
    const tN = new Map<string, number>();
    for (const nodeId of network.diffusionNodeIds) {
      tN.set(nodeId, temperatures.get(nodeId)!);
    }

    // Newton-Raphson iteration
    // Initial guess: T = T_n (current temperatures already set)
    let converged = false;
    let newtonIter = 0;

    for (newtonIter = 0; newtonIter < MAX_NEWTON_ITER; newtonIter++) {
      // Solve arithmetic nodes at trial temperature
      solveArithmeticNodes(temperatures, t + dt, network);

      let maxDeltaT = 0;

      for (const nodeId of network.diffusionNodeIds) {
        const node = network.nodes.get(nodeId)!;
        if (node.capacitance <= 0) continue;

        const tCurrent = temperatures.get(nodeId)!;
        const tPrev = tN.get(nodeId)!;

        // F_i = C_i * (T_i - T_n_i) / dt - Q_net_i(T)
        const conductorHeat = computeTotalConductorHeatFlow(
          nodeId,
          temperatures,
          network,
        );
        const externalHeat = computeNodeHeatLoad(
          nodeId,
          network.heatLoads,
          t + dt,
          network,
        );
        const qNet = conductorHeat + externalHeat;

        const F = (node.capacitance * (tCurrent - tPrev)) / dt - qNet;

        // J_ii
        const J = computeDiagonalJacobian(
          nodeId,
          temperatures,
          network,
          node.capacitance,
          dt,
        );

        // Safeguard against zero Jacobian
        if (Math.abs(J) < 1e-30) continue;

        // ΔT = -F / J
        const deltaT = -F / J;
        temperatures.set(nodeId, tCurrent + deltaT);

        if (Math.abs(deltaT) > maxDeltaT) {
          maxDeltaT = Math.abs(deltaT);
        }
      }

      if (maxDeltaT < NEWTON_TOL) {
        converged = true;
        newtonIter++; // Count the final iteration
        break;
      }
    }

    if (!converged) {
      // Newton didn't converge — halve dt and retry
      dt = Math.max(dt / 2, minStep);
      // Reset temperatures to T_n
      for (const nodeId of network.diffusionNodeIds) {
        temperatures.set(nodeId, tN.get(nodeId)!);
      }
      continue;
    }

    // Accept step — boundary nodes stay fixed
    for (const nodeId of network.boundaryNodeIds) {
      const node = network.nodes.get(nodeId);
      if (node?.boundaryTemp !== null && node?.boundaryTemp !== undefined) {
        temperatures.set(nodeId, node.boundaryTemp);
      }
    }

    // Advance time
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

    // Adaptive timestep based on Newton iteration count
    if (newtonIter <= 3) {
      dt = Math.min(dt * 2, maxStep);
    } else if (newtonIter >= 7) {
      dt = Math.max(dt / 2, minStep);
    }
    // Otherwise keep dt unchanged
  }

  // Compute energy balance (same approach as RK4)
  let totalEnergyStored = 0;
  let totalEnergyIn = 0;

  for (const nodeId of network.diffusionNodeIds) {
    const node = network.nodes.get(nodeId);
    if (node) {
      const tFinal = temperatures.get(nodeId) ?? node.initialTemperature;
      totalEnergyStored +=
        node.capacitance * (tFinal - node.initialTemperature);
    }
  }

  for (let i = 1; i < timePoints.length; i++) {
    const dtStep = timePoints[i] - timePoints[i - 1];
    for (const load of network.heatLoads) {
      const node = network.nodes.get(load.nodeId);
      if (node && node.nodeType === 'diffusion') {
        const tMid = (timePoints[i - 1] + timePoints[i]) / 2;
        let Q = 0;
        if (load.loadType === 'constant') Q = load.value;
        else if (load.loadType === 'time_varying') {
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

  // Convert to result arrays
  const nodeResults: NodeResult[] = [];
  for (const [nodeId, data] of nodeResultsMap) {
    nodeResults.push({
      nodeId,
      times: data.times,
      temperatures: data.temperatures,
    });
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
