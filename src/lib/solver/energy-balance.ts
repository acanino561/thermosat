import type { ThermalNetwork, SolverResult } from './types';

/**
 * Comprehensive energy balance check for simulation results.
 *
 * For a closed system:
 * Energy_stored = Energy_in - Energy_out
 * ΔE_stored = Σ C_i * (T_final_i - T_initial_i)
 *
 * For transient results, we check that the total energy stored
 * matches the integrated heat input over the simulation period.
 */
export interface EnergyBalanceReport {
  totalEnergyStored: number; // J - net energy change in capacitances
  totalExternalHeatInput: number; // J - integrated external heat loads
  totalBoundaryHeatFlow: number; // J - heat exchanged with boundary nodes
  imbalance: number; // J - absolute imbalance
  relativeError: number; // fraction - |imbalance| / max(|stored|, |input|)
  isBalanced: boolean; // true if relative error < threshold
}

/**
 * Compute detailed energy balance for a transient simulation.
 */
export function computeEnergyBalance(
  network: ThermalNetwork,
  result: SolverResult,
  threshold: number = 0.05, // 5% relative error threshold
): EnergyBalanceReport {
  // 1. Compute total energy stored (change in thermal energy)
  let totalEnergyStored = 0;
  for (const nodeResult of result.nodeResults) {
    const node = network.nodes.get(nodeResult.nodeId);
    if (!node || node.nodeType !== 'diffusion') continue;

    const tInitial = nodeResult.temperatures[0];
    const tFinal = nodeResult.temperatures[nodeResult.temperatures.length - 1];
    totalEnergyStored += node.capacitance * (tFinal - tInitial);
  }

  // 2. Estimate total external heat input via trapezoidal integration
  let totalExternalHeatInput = 0;
  const timePoints = result.timePoints;

  for (const load of network.heatLoads) {
    const node = network.nodes.get(load.nodeId);
    if (!node) continue;

    for (let i = 1; i < timePoints.length; i++) {
      const dt = timePoints[i] - timePoints[i - 1];
      let qPrev = 0;
      let qCurr = 0;

      if (load.loadType === 'constant') {
        qPrev = load.value;
        qCurr = load.value;
      } else if (load.loadType === 'time_varying') {
        // Interpolate at each time point
        qPrev = interpolateAtTime(load.timeValues, timePoints[i - 1]);
        qCurr = interpolateAtTime(load.timeValues, timePoints[i]);
      }
      // Orbital loads are harder to integrate precisely — skip for now

      totalExternalHeatInput += (qPrev + qCurr) * 0.5 * dt;
    }
  }

  // 3. Compute heat flow through boundary nodes
  let totalBoundaryHeatFlow = 0;
  for (const conductorFlow of result.conductorFlows) {
    const conductor = network.conductors.find(
      (c) => c.id === conductorFlow.conductorId,
    );
    if (!conductor) continue;

    const fromNode = network.nodes.get(conductor.nodeFromId);
    const toNode = network.nodes.get(conductor.nodeToId);

    const isBoundaryConnected =
      fromNode?.nodeType === 'boundary' || toNode?.nodeType === 'boundary';

    if (isBoundaryConnected) {
      for (let i = 1; i < conductorFlow.times.length; i++) {
        const dt = conductorFlow.times[i] - conductorFlow.times[i - 1];
        const qPrev = conductorFlow.flows[i - 1] ?? 0;
        const qCurr = conductorFlow.flows[i] ?? 0;

        // If boundary node is "from", positive flow = heat leaving boundary into system
        if (fromNode?.nodeType === 'boundary') {
          totalBoundaryHeatFlow += (qPrev + qCurr) * 0.5 * dt;
        } else {
          totalBoundaryHeatFlow -= (qPrev + qCurr) * 0.5 * dt;
        }
      }
    }
  }

  // 4. Energy balance check
  const totalInput = totalExternalHeatInput + totalBoundaryHeatFlow;
  const imbalance = Math.abs(totalInput - totalEnergyStored);
  const maxMagnitude = Math.max(
    Math.abs(totalEnergyStored),
    Math.abs(totalInput),
    1e-10,
  );
  const relativeError = imbalance / maxMagnitude;

  return {
    totalEnergyStored,
    totalExternalHeatInput,
    totalBoundaryHeatFlow,
    imbalance,
    relativeError,
    isBalanced: relativeError < threshold,
  };
}

/**
 * Simple piecewise-linear interpolation helper.
 */
function interpolateAtTime(
  timeValues: Array<{ time: number; value: number }>,
  t: number,
): number {
  if (!timeValues || timeValues.length === 0) return 0;
  if (t <= timeValues[0].time) return timeValues[0].value;
  if (t >= timeValues[timeValues.length - 1].time) {
    return timeValues[timeValues.length - 1].value;
  }

  for (let i = 0; i < timeValues.length - 1; i++) {
    if (t >= timeValues[i].time && t <= timeValues[i + 1].time) {
      const frac =
        (t - timeValues[i].time) /
        (timeValues[i + 1].time - timeValues[i].time);
      return timeValues[i].value + frac * (timeValues[i + 1].value - timeValues[i].value);
    }
  }

  return timeValues[timeValues.length - 1].value;
}
