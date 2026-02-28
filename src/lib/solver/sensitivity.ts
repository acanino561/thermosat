import { db } from '@/lib/db/client';
import { sensitivityMatrices } from '@/lib/db/schema';
import type { SensitivityEntry } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { buildThermalNetwork, runSimulation } from './thermal-network';
import type {
  SimulationConfig,
  SolverNode,
  SolverConductor,
  SolverHeatLoad,
  ThermalNetwork,
  OrbitalConfig,
} from './types';

// Database row types matching thermal-network.ts
interface DbNode {
  id: string;
  name: string;
  nodeType: 'diffusion' | 'arithmetic' | 'boundary';
  temperature: number;
  capacitance: number | null;
  boundaryTemp: number | null;
  area: number | null;
  mass?: number | null;
  absorptivity: number | null;
  emissivity: number | null;
}

interface DbConductor {
  id: string;
  name: string;
  conductorType: 'linear' | 'radiation' | 'contact' | 'heat_pipe';
  nodeFromId: string;
  nodeToId: string;
  conductance: number | null;
  area: number | null;
  viewFactor: number | null;
  emissivity: number | null;
  conductanceData?: { points: Array<{ temperature: number; conductance: number }> } | null;
}

interface DbHeatLoad {
  id: string;
  name: string;
  nodeId: string;
  loadType: 'constant' | 'time_varying' | 'orbital';
  value: number | null;
  timeValues: Array<{ time: number; value: number }> | null;
  orbitalParams: {
    surfaceType: 'solar' | 'earth_facing' | 'anti_earth' | 'custom';
    absorptivity: number;
    emissivity: number;
    area: number;
  } | null;
}

interface ParameterDef {
  parameterId: string;
  parameterType: 'node_property' | 'conductor' | 'heat_load';
  parameterLabel: string;
  entityId: string;
  getValue: () => number;
  apply: (nodes: DbNode[], conductors: DbConductor[], loads: DbHeatLoad[], value: number) => void;
}

const PERTURBATION_FRACTION = 0.05; // 5%
const MIN_PERTURBATION = 1e-10; // avoid division by zero for zero-valued params

/**
 * Collect all perturbable parameters from the model.
 */
function collectParameters(
  nodes: DbNode[],
  conductorsArr: DbConductor[],
  loads: DbHeatLoad[],
): ParameterDef[] {
  const params: ParameterDef[] = [];

  // Node properties: absorptivity, emissivity, mass
  for (const node of nodes) {
    if (node.nodeType === 'boundary') continue; // boundary nodes are fixed

    if (node.absorptivity !== null && node.absorptivity !== undefined) {
      params.push({
        parameterId: `node_absorptivity_${node.id}`,
        parameterType: 'node_property',
        parameterLabel: `Solar Absorptivity — ${node.name}`,
        entityId: node.id,
        getValue: () => node.absorptivity!,
        apply: (ns) => {
          const n = ns.find(x => x.id === node.id);
          if (n) n.absorptivity = arguments[3] as any; // replaced below
        },
      });
      // Fix the apply function — closures need proper value passing
      params[params.length - 1].apply = (ns, _cs, _ls, val) => {
        const n = ns.find(x => x.id === node.id);
        if (n) n.absorptivity = val;
      };
    }

    if (node.emissivity !== null && node.emissivity !== undefined) {
      params.push({
        parameterId: `node_emissivity_${node.id}`,
        parameterType: 'node_property',
        parameterLabel: `IR Emissivity — ${node.name}`,
        entityId: node.id,
        getValue: () => node.emissivity!,
        apply: (ns, _cs, _ls, val) => {
          const n = ns.find(x => x.id === node.id);
          if (n) n.emissivity = val;
        },
      });
    }

    if (node.capacitance !== null && node.capacitance !== undefined && node.capacitance > 0) {
      params.push({
        parameterId: `node_capacitance_${node.id}`,
        parameterType: 'node_property',
        parameterLabel: `Capacitance — ${node.name}`,
        entityId: node.id,
        getValue: () => node.capacitance!,
        apply: (ns, _cs, _ls, val) => {
          const n = ns.find(x => x.id === node.id);
          if (n) n.capacitance = val;
        },
      });
    }

    if (node.mass !== null && node.mass !== undefined && node.mass > 0) {
      params.push({
        parameterId: `node_mass_${node.id}`,
        parameterType: 'node_property',
        parameterLabel: `Mass — ${node.name}`,
        entityId: node.id,
        getValue: () => node.mass!,
        apply: (ns, _cs, _ls, val) => {
          const n = ns.find(x => x.id === node.id);
          if (n) n.mass = val;
        },
      });
    }
  }

  // Conductor values
  for (const cond of conductorsArr) {
    if ((cond.conductorType === 'linear' || cond.conductorType === 'contact') &&
        cond.conductance !== null && cond.conductance !== undefined && cond.conductance > 0) {
      params.push({
        parameterId: `conductor_conductance_${cond.id}`,
        parameterType: 'conductor',
        parameterLabel: `Conductance — ${cond.name}`,
        entityId: cond.id,
        getValue: () => cond.conductance!,
        apply: (_ns, cs, _ls, val) => {
          const c = cs.find(x => x.id === cond.id);
          if (c) c.conductance = val;
        },
      });
    }

    if (cond.conductorType === 'radiation' &&
        cond.viewFactor !== null && cond.viewFactor !== undefined && cond.viewFactor > 0) {
      params.push({
        parameterId: `conductor_viewfactor_${cond.id}`,
        parameterType: 'conductor',
        parameterLabel: `View Factor — ${cond.name}`,
        entityId: cond.id,
        getValue: () => cond.viewFactor!,
        apply: (_ns, cs, _ls, val) => {
          const c = cs.find(x => x.id === cond.id);
          if (c) c.viewFactor = val;
        },
      });
    }
  }

  // Heat load magnitudes (constant loads only — time-varying and orbital excluded)
  for (const load of loads) {
    if (load.loadType === 'constant' && load.value !== null && load.value !== undefined) {
      params.push({
        parameterId: `heatload_value_${load.id}`,
        parameterType: 'heat_load',
        parameterLabel: `Heat Load — ${load.name}`,
        entityId: load.id,
        getValue: () => load.value!,
        apply: (_ns, _cs, ls, val) => {
          const l = ls.find(x => x.id === load.id);
          if (l) l.value = val;
        },
      });
    }
  }

  return params;
}

/**
 * Deep-clone arrays of DB objects for perturbation.
 */
function cloneData(
  nodes: DbNode[],
  conductorsArr: DbConductor[],
  loads: DbHeatLoad[],
): { nodes: DbNode[]; conductors: DbConductor[]; loads: DbHeatLoad[] } {
  return {
    nodes: nodes.map(n => ({ ...n })),
    conductors: conductorsArr.map(c => ({ ...c, conductanceData: c.conductanceData ? { points: [...c.conductanceData.points] } : c.conductanceData })),
    loads: loads.map(l => ({ ...l, timeValues: l.timeValues ? [...l.timeValues] : l.timeValues, orbitalParams: l.orbitalParams ? { ...l.orbitalParams } : null })),
  };
}

/**
 * Run a steady-state solve and return the final temperature map (nodeId → temperature).
 */
function runSteadyStateSolve(
  nodes: DbNode[],
  conductorsArr: DbConductor[],
  loads: DbHeatLoad[],
  orbitalConfig: OrbitalConfig | null,
): Map<string, number> {
  const network = buildThermalNetwork(nodes, conductorsArr, loads, orbitalConfig);

  const config: SimulationConfig = {
    simulationType: 'steady_state',
    timeStart: 0,
    timeEnd: 0,
    timeStep: 1,
    maxIterations: 1000,
    tolerance: 1e-6,
    minStep: 0.001,
    maxStep: 10,
  };

  const result = runSimulation(network, config);

  const temps = new Map<string, number>();
  for (const nr of result.nodeResults) {
    const lastTemp = nr.temperatures[nr.temperatures.length - 1];
    temps.set(nr.nodeId, lastTemp);
  }

  return temps;
}

/**
 * Compute second-order accuracy estimate.
 * secondOrder = (T_plus - 2*T_base + T_minus) / (delta)²
 */
function estimateSecondOrder(
  tPlus: number,
  tBase: number,
  tMinus: number,
  delta: number,
): number {
  if (Math.abs(delta) < MIN_PERTURBATION) return 0;
  return (tPlus - 2 * tBase + tMinus) / (delta * delta);
}

/**
 * Main entry point: compute sensitivity matrix for a completed simulation run.
 * Called as a background task after simulation completes.
 */
export async function computeSensitivityMatrix(
  sensitivityId: string,
  nodes: DbNode[],
  conductorsArr: DbConductor[],
  loads: DbHeatLoad[],
  orbitalConfig: OrbitalConfig | null,
): Promise<void> {
  try {
    // Mark as running
    await db
      .update(sensitivityMatrices)
      .set({ status: 'running' })
      .where(eq(sensitivityMatrices.id, sensitivityId));

    // Collect parameters
    const parameters = collectParameters(nodes, conductorsArr, loads);

    if (parameters.length === 0) {
      await db
        .update(sensitivityMatrices)
        .set({
          status: 'complete',
          computedAt: new Date(),
          entries: [],
        })
        .where(eq(sensitivityMatrices.id, sensitivityId));
      return;
    }

    // Run baseline steady-state solve
    const baselineTemps = runSteadyStateSolve(nodes, conductorsArr, loads, orbitalConfig);

    // Get all node IDs for output (non-boundary)
    const outputNodeIds = nodes
      .filter(n => n.nodeType !== 'boundary')
      .map(n => n.id);

    const entries: SensitivityEntry[] = [];

    // For each parameter, perturb ±5% and compute sensitivity
    for (const param of parameters) {
      const baseValue = param.getValue();
      const delta = Math.max(Math.abs(baseValue * PERTURBATION_FRACTION), MIN_PERTURBATION);

      // +5% perturbation
      const plusData = cloneData(nodes, conductorsArr, loads);
      param.apply(plusData.nodes, plusData.conductors, plusData.loads, baseValue + delta);
      const plusTemps = runSteadyStateSolve(plusData.nodes, plusData.conductors, plusData.loads, orbitalConfig);

      // -5% perturbation
      const minusData = cloneData(nodes, conductorsArr, loads);
      param.apply(minusData.nodes, minusData.conductors, minusData.loads, baseValue - delta);
      const minusTemps = runSteadyStateSolve(minusData.nodes, minusData.conductors, minusData.loads, orbitalConfig);

      // Compute derivatives for each output node
      for (const nodeId of outputNodeIds) {
        const tPlus = plusTemps.get(nodeId) ?? 0;
        const tMinus = minusTemps.get(nodeId) ?? 0;
        const tBase = baselineTemps.get(nodeId) ?? 0;

        // Central difference: dT/dp = (T+ - T-) / (2 * delta)
        const dT_dp = (tPlus - tMinus) / (2 * delta);

        // Second-order estimate
        const secondOrder = estimateSecondOrder(tPlus, tBase, tMinus, delta);

        entries.push({
          parameterId: param.parameterId,
          parameterType: param.parameterType,
          entityId: param.entityId,
          nodeId,
          dT_dp,
          secondOrderEstimate: secondOrder,
        });
      }
    }

    // Store results
    await db
      .update(sensitivityMatrices)
      .set({
        status: 'complete',
        computedAt: new Date(),
        entries,
      })
      .where(eq(sensitivityMatrices.id, sensitivityId));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown sensitivity computation error';
    console.error('Sensitivity computation failed:', errorMessage);

    await db
      .update(sensitivityMatrices)
      .set({
        status: 'failed',
        errorMessage,
      })
      .where(eq(sensitivityMatrices.id, sensitivityId));
  }
}
