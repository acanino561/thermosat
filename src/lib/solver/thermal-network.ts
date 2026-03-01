/**
 * PERFORMANCE (2026-03-01):
 * Before optimization: 1000 nodes / 90 min = 99,908 ms
 * After optimization:  1000 nodes / 90 min = 569 ms
 * 
 * Key wins:
 * - Adjacency list for conductors (O(degree) vs O(C) per node) — ~175x speedup
 * - Pre-indexed heat loads per node (O(loads_on_node) vs O(H) per node)
 * - Batched DB writes in simulate route (100 per batch vs 1 per node)
 * 
 * 100-node benchmark: 59 ms (target: < 3000 ms) ✓
 * 1000-node benchmark: 569 ms (target: < 30000 ms) ✓
 */

import type {
  SolverNode,
  SolverConductor,
  SolverHeatLoad,
  ThermalNetwork,
  OrbitalConfig,
  SimulationConfig,
  SolverResult,
  NodeConductorEntry,
} from './types';
import {
  calculateOrbitalEnvironment,
  generateOrbitalHeatProfile,
} from './orbital-environment';
import { solveTransient } from './rk4-solver';
import { solveImplicitEuler } from './implicit-euler';
import { solveSteadyState } from './steady-state-solver';

// Database row types (partial, matching schema)
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

/**
 * Build a ThermalNetwork from database model data.
 */
export function buildThermalNetwork(
  dbNodes: DbNode[],
  dbConductors: DbConductor[],
  dbHeatLoads: DbHeatLoad[],
  orbitalConfig: OrbitalConfig | null,
): ThermalNetwork {
  // Convert DB nodes to solver nodes
  const nodes = new Map<string, SolverNode>();
  const diffusionNodeIds: string[] = [];
  const arithmeticNodeIds: string[] = [];
  const boundaryNodeIds: string[] = [];

  for (const dbNode of dbNodes) {
    const solverNode: SolverNode = {
      id: dbNode.id,
      name: dbNode.name,
      nodeType: dbNode.nodeType,
      temperature: dbNode.temperature,
      initialTemperature: dbNode.temperature,
      capacitance: dbNode.capacitance ?? 0,
      boundaryTemp: dbNode.boundaryTemp,
      area: dbNode.area ?? 0,
      absorptivity: dbNode.absorptivity ?? 0.5,
      emissivity: dbNode.emissivity ?? 0.5,
    };

    nodes.set(dbNode.id, solverNode);

    switch (dbNode.nodeType) {
      case 'diffusion':
        diffusionNodeIds.push(dbNode.id);
        break;
      case 'arithmetic':
        arithmeticNodeIds.push(dbNode.id);
        break;
      case 'boundary':
        boundaryNodeIds.push(dbNode.id);
        break;
    }
  }

  // Convert DB conductors to solver conductors
  const conductors: SolverConductor[] = dbConductors.map((c) => ({
    id: c.id,
    name: c.name,
    conductorType: c.conductorType,
    nodeFromId: c.nodeFromId,
    nodeToId: c.nodeToId,
    conductance: c.conductance ?? 0,
    area: c.area ?? 0,
    viewFactor: c.viewFactor ?? 0,
    emissivity: c.emissivity ?? 0,
    conductanceData: c.conductanceData ?? null,
  }));

  // Convert DB heat loads to solver heat loads
  const heatLoads: SolverHeatLoad[] = dbHeatLoads.map((hl) => ({
    id: hl.id,
    name: hl.name,
    nodeId: hl.nodeId,
    loadType: hl.loadType,
    value: hl.value ?? 0,
    timeValues: hl.timeValues ?? [],
    orbitalParams: hl.orbitalParams ?? null,
  }));

  // Calculate orbital environment if config provided
  let orbitalEnv = null;
  let orbitalProfile = null;
  if (orbitalConfig) {
    orbitalEnv = calculateOrbitalEnvironment(orbitalConfig);
    orbitalProfile = generateOrbitalHeatProfile(orbitalConfig, orbitalEnv);
  }

  const nodeIds = [...diffusionNodeIds, ...arithmeticNodeIds, ...boundaryNodeIds];

  // Build adjacency list for conductors
  const nodeConductors = new Map<string, NodeConductorEntry[]>();
  for (const nodeId of nodeIds) {
    nodeConductors.set(nodeId, []);
  }
  for (const conductor of conductors) {
    nodeConductors.get(conductor.nodeFromId)?.push({
      conductor,
      otherNodeId: conductor.nodeToId,
      sign: -1, // heat flows OUT from "from" node
    });
    nodeConductors.get(conductor.nodeToId)?.push({
      conductor,
      otherNodeId: conductor.nodeFromId,
      sign: 1, // heat flows IN to "to" node
    });
  }

  // Build per-node heat load index
  const nodeHeatLoads = new Map<string, SolverHeatLoad[]>();
  for (const nodeId of nodeIds) {
    nodeHeatLoads.set(nodeId, []);
  }
  for (const hl of heatLoads) {
    nodeHeatLoads.get(hl.nodeId)?.push(hl);
  }

  return {
    nodes,
    conductors,
    heatLoads,
    orbitalConfig,
    orbitalEnv,
    orbitalProfile,
    nodeIds,
    diffusionNodeIds,
    arithmeticNodeIds,
    boundaryNodeIds,
    nodeConductors,
    nodeHeatLoads,
  };
}

/**
 * Run a simulation on a thermal network with given configuration.
 */
export function runSimulation(
  network: ThermalNetwork,
  config: SimulationConfig,
): SolverResult {
  // Validate network has nodes
  if (network.nodes.size === 0) {
    throw new Error('Thermal network has no nodes');
  }

  // Validate all conductors reference valid nodes
  for (const conductor of network.conductors) {
    if (!network.nodes.has(conductor.nodeFromId)) {
      throw new Error(
        `Conductor "${conductor.name}" references non-existent node ${conductor.nodeFromId}`,
      );
    }
    if (!network.nodes.has(conductor.nodeToId)) {
      throw new Error(
        `Conductor "${conductor.name}" references non-existent node ${conductor.nodeToId}`,
      );
    }
  }

  // Validate all heat loads reference valid nodes
  for (const load of network.heatLoads) {
    if (!network.nodes.has(load.nodeId)) {
      throw new Error(
        `Heat load "${load.name}" references non-existent node ${load.nodeId}`,
      );
    }
  }

  if (config.simulationType === 'transient') {
    if (config.solverMethod === 'implicit_euler') {
      return solveImplicitEuler(network, config);
    }
    return solveTransient(network, config);
  } else {
    return solveSteadyState(network, config);
  }
}
