/**
 * V&V Benchmark 9 — Heat Pipe Conductor
 *
 * Validates heat pipe conductor with piecewise-linear G_eff(T) curve.
 * Reference: Q = G_eff(T_avg) × ΔT → ΔT = Q / G_eff at steady state.
 *
 * Conductance curve:
 *   T < 280K: G_eff = 0.5 W/K (startup)
 *   280–320K: G_eff = 5.0 W/K (operating)
 *   T > 320K: G_eff = 0.5 W/K (burnout)
 *
 * Three operating points validated against analytical ΔT = Q / G_eff.
 */

import { buildThermalNetwork } from '../../lib/solver/thermal-network';
import { solveSteadyState } from '../../lib/solver/steady-state-solver';
import { interpolateGeff } from '../../lib/solver/heat-pipe';
import type { SolverNode, SolverConductor, SolverHeatLoad, SimulationConfig } from '../../lib/solver/types';

let exitCode = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    exitCode = 1;
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

function relativeError(actual: number, expected: number): number {
  if (expected === 0) return Math.abs(actual);
  return Math.abs((actual - expected) / expected);
}

// Heat pipe conductance curve (piecewise linear)
const conductancePoints = [
  { temperature: 200, conductance: 0.5 },
  { temperature: 279, conductance: 0.5 },
  { temperature: 280, conductance: 5.0 },
  { temperature: 320, conductance: 5.0 },
  { temperature: 321, conductance: 0.5 },
  { temperature: 400, conductance: 0.5 },
];

interface TestCase {
  name: string;
  Q: number;       // heat load (W)
  T_cold: number;  // boundary node temperature (K)
}

const testCases: TestCase[] = [
  { name: 'Cold case (below operating range)', Q: 2, T_cold: 270 },
  { name: 'Nominal case (operating range)',    Q: 10, T_cold: 290 },
  { name: 'Hot case (above operating range)',  Q: 20, T_cold: 330 },
];

console.log('🔬 Benchmark 9 — Heat Pipe Conductor\n');

for (const tc of testCases) {
  console.log(`\n── ${tc.name} ──`);
  console.log(`  Q = ${tc.Q} W, T_cold = ${tc.T_cold} K`);

  // Analytical: at steady state, T_hot = T_cold + Q/G_eff(T_avg)
  // T_avg = (T_hot + T_cold)/2, and T_hot = T_cold + Q/G_eff(T_avg)
  // So T_avg = T_cold + Q/(2*G_eff(T_avg)) — solve iteratively
  let T_hot_analytical = tc.T_cold + 10; // initial guess
  for (let i = 0; i < 100; i++) {
    const T_avg = (T_hot_analytical + tc.T_cold) / 2;
    const gEff = interpolateGeff(conductancePoints, T_avg);
    const T_hot_new = tc.T_cold + tc.Q / gEff;
    if (Math.abs(T_hot_new - T_hot_analytical) < 1e-10) break;
    T_hot_analytical = T_hot_new;
  }

  const T_avg_analytical = (T_hot_analytical + tc.T_cold) / 2;
  const G_eff_analytical = interpolateGeff(conductancePoints, T_avg_analytical);
  const deltaT_analytical = tc.Q / G_eff_analytical;

  console.log(`  Analytical: G_eff = ${G_eff_analytical.toFixed(3)} W/K, ΔT = ${deltaT_analytical.toFixed(4)} K, T_hot = ${T_hot_analytical.toFixed(4)} K`);

  // Build solver model
  const nodes: SolverNode[] = [
    {
      id: 'hot', name: 'Hot node', nodeType: 'diffusion',
      temperature: tc.T_cold + 5, initialTemperature: tc.T_cold + 5, capacitance: 100,
      boundaryTemp: null, area: 0, absorptivity: 0, emissivity: 0,
    },
    {
      id: 'cold', name: 'Cold node', nodeType: 'boundary',
      temperature: tc.T_cold, initialTemperature: tc.T_cold, capacitance: 0,
      boundaryTemp: tc.T_cold, area: 0, absorptivity: 0, emissivity: 0,
    },
  ];

  const conductors: SolverConductor[] = [
    {
      id: 'hp', name: 'Heat pipe', conductorType: 'heat_pipe',
      nodeFromId: 'hot', nodeToId: 'cold',
      conductance: 0, area: 0, viewFactor: 0, emissivity: 0,
      conductanceData: { points: conductancePoints },
    },
  ];

  const heatLoads: SolverHeatLoad[] = [
    {
      id: 'load', name: 'Heat load', nodeId: 'hot',
      loadType: 'constant', value: tc.Q, timeValues: [], orbitalParams: null,
    },
  ];

  const network = buildThermalNetwork(nodes, conductors, heatLoads, null);

  const config: SimulationConfig = {
    simulationType: 'steady_state',
    timeStart: 0, timeEnd: 0, timeStep: 0,
    maxIterations: 2000, tolerance: 1e-8,
    minStep: 0, maxStep: 0,
  };

  const result = solveSteadyState(network, config);
  const hotResult = result.nodeResults.find(r => r.nodeId === 'hot');
  const T_hot_solver = hotResult?.temperatures[hotResult.temperatures.length - 1] ?? 0;
  const deltaT_solver = T_hot_solver - tc.T_cold;

  const err = relativeError(deltaT_solver, deltaT_analytical);
  console.log(`  Solver:     T_hot = ${T_hot_solver.toFixed(4)} K, ΔT = ${deltaT_solver.toFixed(4)} K`);
  console.log(`  Error: ${(err * 100).toFixed(4)}%`);

  assert(err < 0.10, `B9 ${tc.name}: ΔT error ${(err * 100).toFixed(4)}% < 10%`);
}

console.log('\n══════════════════════════════════════════════════');
console.log('Benchmark 9 complete.');
process.exitCode = exitCode;
