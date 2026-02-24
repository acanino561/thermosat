/**
 * Solver Validation Test Script
 *
 * Test 1: Two-node conduction — analytical solution comparison
 * Test 2: Single node radiation to space — Stefan-Boltzmann equilibrium
 * Test 3: Orbital environment calculation — sanity checks
 */

import { buildThermalNetwork } from '../lib/solver/thermal-network';
import { solveTransient } from '../lib/solver/rk4-solver';
import { solveSteadyState } from '../lib/solver/steady-state-solver';
import { calculateOrbitalEnvironment } from '../lib/solver/orbital-environment';
import { STEFAN_BOLTZMANN } from '../lib/solver/types';
import type { SolverNode, SolverConductor, SolverHeatLoad, SimulationConfig } from '../lib/solver/types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

function approxEqual(a: number, b: number, tolerance: number): boolean {
  return Math.abs(a - b) <= tolerance;
}

// ── Test 1: Two-node conduction steady state ──────────────────────────────
// Node A: boundary at 400K
// Node B: boundary at 300K
// Conductor: G = 1.0 W/K
// Middle node C (diffusion): should settle at 350K (equal conductors to A and B)

function testTwoNodeConduction() {
  console.log('\n═══ Test 1: Two-Node Conduction (Steady State) ═══');

  const nodes: SolverNode[] = [
    {
      id: 'A', name: 'Hot boundary', nodeType: 'boundary',
      temperature: 400, initialTemperature: 400, capacitance: 0,
      boundaryTemp: 400, area: 0, absorptivity: 0, emissivity: 0,
    },
    {
      id: 'B', name: 'Cold boundary', nodeType: 'boundary',
      temperature: 300, initialTemperature: 300, capacitance: 0,
      boundaryTemp: 300, area: 0, absorptivity: 0, emissivity: 0,
    },
    {
      id: 'C', name: 'Middle node', nodeType: 'diffusion',
      temperature: 200, initialTemperature: 200, capacitance: 100,
      boundaryTemp: null, area: 0, absorptivity: 0, emissivity: 0,
    },
  ];

  const conductors: SolverConductor[] = [
    {
      id: 'AC', name: 'A-C', conductorType: 'linear',
      nodeFromId: 'A', nodeToId: 'C', conductance: 1.0,
      area: 0, viewFactor: 0, emissivity: 0,
    },
    {
      id: 'CB', name: 'C-B', conductorType: 'linear',
      nodeFromId: 'C', nodeToId: 'B', conductance: 1.0,
      area: 0, viewFactor: 0, emissivity: 0,
    },
  ];

  const heatLoads: SolverHeatLoad[] = [];
  const network = buildThermalNetwork(nodes, conductors, heatLoads, null);

  // Steady state
  const ssConfig: SimulationConfig = {
    simulationType: 'steady_state',
    timeStart: 0, timeEnd: 0, timeStep: 0,
    maxIterations: 1000, tolerance: 1e-6,
    minStep: 0, maxStep: 0,
  };

  const ssResult = solveSteadyState(network, ssConfig);
  const nodeC = ssResult.nodeResults.find(r => r.nodeId === 'C');
  const finalTemp = nodeC?.temperatures[nodeC.temperatures.length - 1] ?? 0;

  assert(ssResult.converged, 'Steady state converged');
  assert(approxEqual(finalTemp, 350, 0.5), `Middle node = ${finalTemp.toFixed(2)}K (expected 350K)`);

  // Transient — should also converge to 350K
  const trConfig: SimulationConfig = {
    simulationType: 'transient',
    timeStart: 0, timeEnd: 10000, timeStep: 10,
    maxIterations: 100000, tolerance: 0.01,
    minStep: 0.01, maxStep: 100,
  };

  const trResult = solveTransient(network, trConfig);
  const nodeCtr = trResult.nodeResults.find(r => r.nodeId === 'C');
  const finalTempTr = nodeCtr?.temperatures[nodeCtr.temperatures.length - 1] ?? 0;

  assert(approxEqual(finalTempTr, 350, 1.0), `Transient final = ${finalTempTr.toFixed(2)}K (expected ~350K)`);
}

// ── Test 2: Radiation equilibrium ─────────────────────────────────────────
// Single node with constant heat load Q, radiating to space (0K boundary)
// Equilibrium: Q = σ * ε * A * T^4 → T = (Q / (σ * ε * A))^0.25

function testRadiationEquilibrium() {
  console.log('\n═══ Test 2: Radiation Equilibrium ═══');

  const Q = 100; // W
  const epsilon = 0.9;
  const area = 1.0; // m²
  const expectedT = Math.pow(Q / (STEFAN_BOLTZMANN * epsilon * area), 0.25);

  console.log(`Analytical equilibrium T = ${expectedT.toFixed(2)}K`);

  const nodes: SolverNode[] = [
    {
      id: 'plate', name: 'Radiating plate', nodeType: 'diffusion',
      temperature: 200, initialTemperature: 200, capacitance: 500,
      boundaryTemp: null, area: area, absorptivity: 0.3, emissivity: epsilon,
    },
    {
      id: 'space', name: 'Deep space', nodeType: 'boundary',
      temperature: 3, initialTemperature: 3, capacitance: 0,
      boundaryTemp: 3, area: 0, absorptivity: 0, emissivity: 0,
    },
  ];

  const conductors: SolverConductor[] = [
    {
      id: 'rad', name: 'Radiation to space', conductorType: 'radiation',
      nodeFromId: 'plate', nodeToId: 'space',
      conductance: 0, area: area, viewFactor: 1.0, emissivity: epsilon,
    },
  ];

  const heatLoads: SolverHeatLoad[] = [
    {
      id: 'heater', name: 'Internal dissipation', nodeId: 'plate',
      loadType: 'constant', value: Q, timeValues: [], orbitalParams: null,
    },
  ];

  const network = buildThermalNetwork(nodes, conductors, heatLoads, null);

  const config: SimulationConfig = {
    simulationType: 'transient',
    timeStart: 0, timeEnd: 50000, timeStep: 10,
    maxIterations: 100000, tolerance: 0.01,
    minStep: 0.01, maxStep: 200,
  };

  const result = solveTransient(network, config);
  const plateResult = result.nodeResults.find(r => r.nodeId === 'plate');
  const finalTemp = plateResult?.temperatures[plateResult.temperatures.length - 1] ?? 0;

  // Tolerance is wider because we're radiating to 3K not 0K
  const expectedWithSpace = Math.pow(Q / (STEFAN_BOLTZMANN * epsilon * area) + 3**4, 0.25);
  assert(
    approxEqual(finalTemp, expectedWithSpace, 2.0),
    `Radiation equilibrium = ${finalTemp.toFixed(2)}K (expected ~${expectedWithSpace.toFixed(2)}K)`,
  );
}

// ── Test 3: Orbital Environment Sanity Check ──────────────────────────────

function testOrbitalEnvironment() {
  console.log('\n═══ Test 3: Orbital Environment (LEO 400km) ═══');

  const env = calculateOrbitalEnvironment({
    altitude: 400,
    inclination: 51.6, // ISS
    raan: 0,
    epoch: '2026-03-21', // equinox
  });

  console.log(`  Orbital period: ${(env.orbitalPeriod / 60).toFixed(1)} min`);
  console.log(`  Beta angle: ${env.betaAngle.toFixed(1)}°`);
  console.log(`  Eclipse fraction: ${(env.eclipseFraction * 100).toFixed(1)}%`);
  console.log(`  Earth view factor: ${env.earthViewFactor.toFixed(3)}`);

  // ISS orbital period should be ~92 minutes
  assert(approxEqual(env.orbitalPeriod / 60, 92.5, 2), `Orbital period ~92.5 min`);

  // Eclipse fraction for ISS-like orbit should be ~35%
  assert(env.eclipseFraction > 0.2 && env.eclipseFraction < 0.5, `Eclipse fraction 20-50%`);

  // Earth view factor at 400km should be ~0.88
  assert(env.earthViewFactor > 0.8 && env.earthViewFactor < 0.95, `Earth VF 0.8-0.95`);

  // Solar flux should be ~1361 W/m²
  assert(approxEqual(env.solarFlux, 1361, 50), `Solar flux ~1361 W/m²`);
}

// ── Run All Tests ─────────────────────────────────────────────────────────

console.log('🔬 Spacecraft Thermal Solver — Validation Tests\n');

testTwoNodeConduction();
testRadiationEquilibrium();
testOrbitalEnvironment();

console.log('\n══════════════════════════════════════════════════');
console.log('Tests complete.');
