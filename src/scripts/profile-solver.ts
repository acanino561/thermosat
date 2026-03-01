/**
 * Solver performance profiling script.
 * Generates synthetic thermal models and benchmarks the solver.
 * 
 * Usage: npx tsx src/scripts/profile-solver.ts
 */

import { buildThermalNetwork, runSimulation } from '../lib/solver/thermal-network';
import type { SimulationConfig, OrbitalConfig } from '../lib/solver/types';

function generateModel(nodeCount: number) {
  // Generate nodes as diffusion nodes with thermal capacitance
  const nodes = Array.from({ length: nodeCount }, (_, i) => ({
    id: `node-${i}`,
    name: `Node ${i}`,
    nodeType: 'diffusion' as const,
    temperature: 270 + Math.random() * 40, // 270-310 K
    capacitance: 500 + Math.random() * 1500, // 500-2000 J/K
    boundaryTemp: null,
    area: 0.01 + Math.random() * 0.05, // 0.01-0.06 m²
    absorptivity: 0.3 + Math.random() * 0.5,
    emissivity: 0.3 + Math.random() * 0.6,
  }));

  // Add 2 boundary nodes
  nodes.push({
    id: 'boundary-space',
    name: 'Space',
    nodeType: 'boundary' as const,
    temperature: 3,
    capacitance: 0,
    boundaryTemp: 3 as any,
    area: 0,
    absorptivity: 0,
    emissivity: 0,
  } as any);
  nodes.push({
    id: 'boundary-earth',
    name: 'Earth',
    nodeType: 'boundary' as const,
    temperature: 255,
    capacitance: 0,
    boundaryTemp: 255 as any,
    area: 0,
    absorptivity: 0,
    emissivity: 0,
  } as any);

  // Generate conductors: ~3 conductors per node (sparse mesh)
  const conductors: any[] = [];
  let cIdx = 0;

  // Chain neighbors (linear topology)
  for (let i = 0; i < nodeCount - 1; i++) {
    conductors.push({
      id: `cond-${cIdx++}`,
      name: `Linear ${i}-${i + 1}`,
      conductorType: 'linear',
      nodeFromId: `node-${i}`,
      nodeToId: `node-${i + 1}`,
      conductance: 0.5 + Math.random() * 2,
      area: 0,
      viewFactor: 0,
      emissivity: 0,
    });
  }

  // Random cross-links (~1 per node)
  for (let i = 0; i < nodeCount; i++) {
    const j = Math.floor(Math.random() * nodeCount);
    if (j !== i) {
      conductors.push({
        id: `cond-${cIdx++}`,
        name: `Cross ${i}-${j}`,
        conductorType: 'linear',
        nodeFromId: `node-${i}`,
        nodeToId: `node-${j}`,
        conductance: 0.1 + Math.random() * 0.5,
        area: 0,
        viewFactor: 0,
        emissivity: 0,
      });
    }
  }

  // Radiation to space for ~20% of nodes
  for (let i = 0; i < nodeCount; i += 5) {
    conductors.push({
      id: `cond-${cIdx++}`,
      name: `Rad ${i}-space`,
      conductorType: 'radiation',
      nodeFromId: `node-${i}`,
      nodeToId: 'boundary-space',
      conductance: 0,
      area: 0.01 + Math.random() * 0.02,
      viewFactor: 0.5 + Math.random() * 0.5,
      emissivity: 0.5 + Math.random() * 0.4,
    });
  }

  // Heat loads: constant loads on ~10% of nodes
  const heatLoads = [];
  for (let i = 0; i < nodeCount; i += 10) {
    heatLoads.push({
      id: `hl-${i}`,
      name: `Load ${i}`,
      nodeId: `node-${i}`,
      loadType: 'constant' as const,
      value: 1 + Math.random() * 10,
      timeValues: null,
      orbitalParams: null,
    });
  }

  return { nodes, conductors, heatLoads };
}

function benchmark(label: string, nodeCount: number, simTimeSec: number, timeStep: number) {
  const { nodes, conductors, heatLoads } = generateModel(nodeCount);

  const orbitalConfig: OrbitalConfig = {
    orbitType: 'leo',
    altitude: 400,
    inclination: 51.6,
    raan: 0,
    epoch: '2026-01-01T00:00:00Z',
  };

  const network = buildThermalNetwork(nodes, conductors, heatLoads, orbitalConfig);

  const config: SimulationConfig = {
    simulationType: 'transient',
    solverMethod: 'rk4',
    timeStart: 0,
    timeEnd: simTimeSec,
    timeStep,
    maxIterations: 10000,
    tolerance: 0.1,
    minStep: timeStep * 0.001,
    maxStep: timeStep * 10,
  };

  console.log(`\n=== ${label} ===`);
  console.log(`Nodes: ${nodeCount} diffusion + 2 boundary`);
  console.log(`Conductors: ${network.conductors.length}`);
  console.log(`Heat loads: ${network.heatLoads.length}`);
  console.log(`Sim time: ${simTimeSec}s, initial dt: ${timeStep}s`);

  const start = performance.now();
  const result = runSimulation(network, config);
  const elapsed = performance.now() - start;

  console.log(`Elapsed: ${elapsed.toFixed(1)} ms`);
  console.log(`Timesteps: ${result.timePoints.length}`);
  console.log(`Converged: ${result.converged}`);
  console.log(`Energy balance error: ${result.energyBalanceError.toFixed(6)}`);

  // Spot check temperatures
  const firstNode = result.nodeResults[0];
  const lastNode = result.nodeResults[nodeCount - 1];
  if (firstNode && lastNode) {
    const fTemps = firstNode.temperatures;
    const lTemps = lastNode.temperatures;
    console.log(`Node 0: ${fTemps[0].toFixed(2)} K → ${fTemps[fTemps.length - 1].toFixed(2)} K`);
    console.log(`Node ${nodeCount - 1}: ${lTemps[0].toFixed(2)} K → ${lTemps[lTemps.length - 1].toFixed(2)} K`);
  }

  return elapsed;
}

// Run benchmarks
console.log('Solver Performance Profiling');
console.log('============================');

const t100 = benchmark('100-node / 90-min', 100, 5400, 10);
const t1000 = benchmark('1000-node / 90-min', 1000, 5400, 10);

console.log('\n=== SUMMARY ===');
console.log(`100-node:  ${t100.toFixed(1)} ms (target: < 3000 ms)`);
console.log(`1000-node: ${t1000.toFixed(1)} ms (target: < 30000 ms)`);
console.log(`100-node:  ${t100 < 3000 ? 'PASS ✓' : 'FAIL ✗'}`);
console.log(`1000-node: ${t1000 < 30000 ? 'PASS ✓' : 'FAIL ✗'}`);
