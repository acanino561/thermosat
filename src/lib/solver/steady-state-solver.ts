import { multiply, inv, matrix, type Matrix } from 'mathjs';
import type {
  ThermalNetwork,
  SimulationConfig,
  SolverResult,
  NodeResult,
  ConductorFlowResult,
} from './types';
import {
  STEFAN_BOLTZMANN,
} from './types';
import {
  computeNodeHeatLoad,
  computeConductorFlow,
  computeTotalConductorHeatFlow,
} from './heat-flow';

/**
 * Newton-Raphson steady-state solver.
 *
 * Solves the nonlinear system F(T) = 0 where:
 * F_i(T) = Σ G_ij*(T_j - T_i) + Σ σ*ε*A*F*(T_j⁴ - T_i⁴) + Q_i = 0
 *
 * Uses Jacobian: J_ij = ∂F_i/∂T_j
 * Iteration: T_new = T - J⁻¹ * F(T)
 */
export function solveSteadyState(
  network: ThermalNetwork,
  config: SimulationConfig,
): SolverResult {
  const { maxIterations, tolerance } = config;

  // Only solve for non-boundary nodes (diffusion + arithmetic)
  const solveNodeIds = [
    ...network.diffusionNodeIds,
    ...network.arithmeticNodeIds,
  ];
  const n = solveNodeIds.length;

  if (n === 0) {
    return {
      nodeResults: [],
      conductorFlows: [],
      timePoints: [0],
      energyBalanceError: 0,
      converged: true,
      iterations: 0,
    };
  }

  // Create index map for matrix operations
  const nodeIndexMap = new Map<string, number>();
  solveNodeIds.forEach((id, idx) => nodeIndexMap.set(id, idx));

  // Initialize temperatures
  const temperatures = new Map<string, number>();
  for (const [nodeId, node] of network.nodes) {
    temperatures.set(nodeId, node.initialTemperature);
  }

  let converged = false;
  let iterations = 0;

  for (let iter = 0; iter < maxIterations; iter++) {
    iterations = iter + 1;

    // Compute residual vector F(T)
    const F = new Array<number>(n).fill(0);

    for (let i = 0; i < n; i++) {
      const nodeId = solveNodeIds[i];

      // Sum conductor heat flows into this node
      const conductorHeat = computeTotalConductorHeatFlow(
        nodeId,
        temperatures,
        network,
      );

      // External heat loads (at t=0 for steady state)
      const externalHeat = computeNodeHeatLoad(
        nodeId,
        network.heatLoads,
        0,
        network,
      );

      F[i] = conductorHeat + externalHeat;
    }

    // Check convergence
    const maxResidual = Math.max(...F.map(Math.abs));
    if (maxResidual < tolerance) {
      converged = true;
      break;
    }

    // Compute Jacobian matrix J(T)
    const J: number[][] = Array.from({ length: n }, () =>
      new Array<number>(n).fill(0),
    );

    for (const conductor of network.conductors) {
      const fromIdx = nodeIndexMap.get(conductor.nodeFromId);
      const toIdx = nodeIndexMap.get(conductor.nodeToId);
      const tFrom = temperatures.get(conductor.nodeFromId) ?? 0;
      const tTo = temperatures.get(conductor.nodeToId) ?? 0;

      if (conductor.conductorType === 'linear' || conductor.conductorType === 'contact') {
        const G = conductor.conductance;

        // ∂F_from/∂T_from: heat leaving from node
        if (fromIdx !== undefined) {
          J[fromIdx][fromIdx] -= G;
          if (toIdx !== undefined) {
            J[fromIdx][toIdx] += G;
          }
        }

        // ∂F_to/∂T_to: heat arriving at to node
        if (toIdx !== undefined) {
          J[toIdx][toIdx] -= G;
          if (fromIdx !== undefined) {
            J[toIdx][fromIdx] += G;
          }
        }
      } else if (conductor.conductorType === 'radiation') {
        const sigma_eps_A_F =
          STEFAN_BOLTZMANN *
          conductor.emissivity *
          conductor.area *
          conductor.viewFactor;

        // dQ/dT_from = σεAF * 4 * T_from³
        // dQ/dT_to = σεAF * (-4) * T_to³  (for flow from → to)
        // but flow = σεAF * (T_from⁴ - T_to⁴)
        // Partial derivatives:
        const dQdTfrom = sigma_eps_A_F * 4 * Math.pow(tFrom, 3);
        const dQdTto = sigma_eps_A_F * 4 * Math.pow(tTo, 3);

        if (fromIdx !== undefined) {
          J[fromIdx][fromIdx] -= dQdTfrom;
          if (toIdx !== undefined) {
            J[fromIdx][toIdx] += dQdTto;
          }
        }

        if (toIdx !== undefined) {
          J[toIdx][toIdx] -= dQdTto;
          if (fromIdx !== undefined) {
            J[toIdx][fromIdx] += dQdTfrom;
          }
        }
      }
    }

    // Solve J * δT = -F using math.js matrix inversion
    // For small systems this is fine; for large systems, use LU decomposition
    try {
      const Jmat = matrix(J);
      const Fvec = matrix(F.map((f) => [-f]));
      const Jinv = inv(Jmat);
      const deltaT = multiply(Jinv, Fvec) as Matrix;

      // Apply Newton step with damping for stability
      const dampingFactor = 1.0;
      for (let i = 0; i < n; i++) {
        const nodeId = solveNodeIds[i];
        const currentT = temperatures.get(nodeId) ?? 293;
        const dT = (deltaT.get([i, 0]) as number) * dampingFactor;

        // Clamp temperature change to prevent wild oscillations
        const maxChange = 100; // K per iteration
        const clampedDT = Math.max(Math.min(dT, maxChange), -maxChange);

        // Ensure temperature stays positive (Kelvin)
        const newT = Math.max(currentT + clampedDT, 1);
        temperatures.set(nodeId, newT);
      }
    } catch {
      // Singular matrix — try with damping
      // Fall back to simple relaxation
      for (let i = 0; i < n; i++) {
        const nodeId = solveNodeIds[i];
        const currentT = temperatures.get(nodeId) ?? 293;
        // Simple gradient step
        const dT = F[i] * 0.01;
        const maxChange = 10;
        const clampedDT = Math.max(Math.min(dT, maxChange), -maxChange);
        temperatures.set(nodeId, Math.max(currentT + clampedDT, 1));
      }
    }
  }

  // Ensure boundary nodes are at their fixed temperatures
  for (const nodeId of network.boundaryNodeIds) {
    const node = network.nodes.get(nodeId);
    if (node?.boundaryTemp !== null && node?.boundaryTemp !== undefined) {
      temperatures.set(nodeId, node.boundaryTemp);
    }
  }

  // Compute final conductor flows
  const conductorFlows: ConductorFlowResult[] = network.conductors.map(
    (conductor) => {
      const tFrom = temperatures.get(conductor.nodeFromId) ?? 0;
      const tTo = temperatures.get(conductor.nodeToId) ?? 0;
      const flow = computeConductorFlow(conductor, tFrom, tTo);
      return {
        conductorId: conductor.id,
        times: [0],
        flows: [flow],
      };
    },
  );

  // Compute energy balance
  let totalExternalQ = 0;
  let totalRadiationToSpace = 0;
  for (const [nodeId] of network.nodes) {
    totalExternalQ += computeNodeHeatLoad(
      nodeId,
      network.heatLoads,
      0,
      network,
    );
  }

  const energyBalanceError =
    totalExternalQ !== 0
      ? Math.abs(totalRadiationToSpace - totalExternalQ) /
        Math.abs(totalExternalQ)
      : 0;

  // Build results
  const nodeResults: NodeResult[] = [];
  for (const [nodeId] of network.nodes) {
    nodeResults.push({
      nodeId,
      times: [0],
      temperatures: [temperatures.get(nodeId) ?? 0],
    });
  }

  return {
    nodeResults,
    conductorFlows,
    timePoints: [0],
    energyBalanceError,
    converged,
    iterations,
  };
}
