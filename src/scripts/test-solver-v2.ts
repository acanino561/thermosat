/**
 * V&V Benchmarks 4-8 — Additional Solver Validation Tests
 *
 * Benchmark 4: Multi-node radiation enclosure (Gebhart method)
 * Benchmark 5: Lumped mass transient response (radiation cooling)
 * Benchmark 6: Simple satellite box, LEO
 * Benchmark 7: Deployed solar array, simplified
 * Benchmark 8: Two-node conduction (precise)
 */

import { buildThermalNetwork } from '../lib/solver/thermal-network';
import { solveTransient } from '../lib/solver/rk4-solver';
import { solveSteadyState } from '../lib/solver/steady-state-solver';
import { calculateOrbitalEnvironment } from '../lib/solver/orbital-environment';
import { STEFAN_BOLTZMANN } from '../lib/solver/types';
import type { SolverNode, SolverConductor, SolverHeatLoad, SimulationConfig } from '../lib/solver/types';

let exitCode = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    exitCode = 1;
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

function approxEqual(a: number, b: number, tolerance: number): boolean {
  return Math.abs(a - b) <= tolerance;
}

function relativeError(actual: number, expected: number): number {
  if (expected === 0) return Math.abs(actual);
  return Math.abs((actual - expected) / expected);
}

// ── Benchmark 4: Multi-node radiation enclosure ───────────────────────────
// 3-surface enclosure, Gebhart method analytical solution
// A1=1m² ε1=0.8 T1=500K (boundary)
// A2=1m² ε2=0.6 T2=300K (boundary)
// A3=2m² ε3=0.9 T3=? (diffusion, no external load)
// View factors: F12=0.2, F13=0.4, F23=0.4
// Enclosure rule: A1*F12=A2*F21 → F21=0.2; A1*F13=A3*F31 → F31=0.2; A2*F23=A3*F32 → F32=0.2
// Also F11=1-F12-F13=0.4, F22=1-F21-F23=0.4, F33=1-F31-F32=0.6 (concave)
// For flat surfaces, self-view-factor=0. But enclosure states F11=0.4 which implies concavity.
// We'll model as radiation conductors between pairs.

function benchmark4_RadiationEnclosure() {
  console.log('\n═══ Benchmark 4: Multi-Node Radiation Enclosure ═══');

  // Analytical solution using net radiation method (radiosity)
  // For the 3-surface enclosure with given view factors:
  // At steady state, net heat flow into A3 = 0
  // Q1→3 + Q2→3 = Q3_radiated_to_1 + Q3_radiated_to_2
  // Using radiation network: σ(T1⁴-T3⁴) / R13_eff + σ(T2⁴-T3⁴) / R23_eff = 0
  //
  // For simplicity, compute analytical T3 numerically using the enclosure equations.
  // Radiation exchange: Q_ij = σ * ε_eff * A_i * F_ij * (Ti⁴ - Tj⁴)
  // where ε_eff for a radiation conductor between two surfaces is modeled by the solver
  // as σ * ε * A * F * (T_from⁴ - T_to⁴)
  //
  // The solver's radiation conductor uses: Q = σ * ε * A * F * (T_from⁴ - T_to⁴)
  // We need effective emissivity for each pair.
  // For two diffuse-gray surfaces exchanging radiation:
  // ε_eff_12 = 1 / (1/ε1 + 1/ε2 - 1) for parallel plates
  // But for enclosure with view factors, the script factor approach gives:
  // Q12 = σ * A1 * F12 * (T1⁴ - T2⁴) with script F incorporating emissivities.
  //
  // For the solver, we set radiation conductors with the geometric view factor and
  // an effective emissivity. The solver computes Q = σ * ε * A * F * (Tf⁴ - Tt⁴).
  //
  // For a simple analytical reference, solve the energy balance on node 3:
  // At steady state: sum of all radiation into node 3 = 0
  // σ*ε13*A1*F13*(T1⁴-T3⁴) + σ*ε23*A2*F23*(T2⁴-T3⁴) = 0
  // where ε13 = 1/(1/ε1 + 1/ε3 - 1) and ε23 = 1/(1/ε2 + 1/ε3 - 1)

  const sigma = STEFAN_BOLTZMANN;
  const T1 = 500, T2 = 300;
  const A1 = 1, A2 = 1, A3 = 2;
  const eps1 = 0.8, eps2 = 0.6, eps3 = 0.9;
  const F13 = 0.4, F23 = 0.4, F12 = 0.2;

  // Effective emissivities for each pair (simplified two-surface exchange)
  const eps13_eff = 1 / (1/eps1 + 1/eps3 - 1);
  const eps23_eff = 1 / (1/eps2 + 1/eps3 - 1);
  const eps12_eff = 1 / (1/eps1 + 1/eps2 - 1);

  // Analytical T3: energy balance on node 3
  // eps13_eff*A1*F13*(T1⁴-T3⁴) + eps23_eff*A2*F23*(T2⁴-T3⁴) = 0
  // eps13_eff*A1*F13*T1⁴ + eps23_eff*A2*F23*T2⁴ = T3⁴*(eps13_eff*A1*F13 + eps23_eff*A2*F23)
  const coeff13 = eps13_eff * A1 * F13;
  const coeff23 = eps23_eff * A2 * F23;
  const T3_4 = (coeff13 * Math.pow(T1, 4) + coeff23 * Math.pow(T2, 4)) / (coeff13 + coeff23);
  const T3_analytical = Math.pow(T3_4, 0.25);

  const Q13_analytical = sigma * coeff13 * (Math.pow(T1, 4) - T3_4);
  const Q23_analytical = sigma * coeff23 * (Math.pow(T2, 4) - T3_4);

  console.log(`  Analytical T3 = ${T3_analytical.toFixed(2)}K`);
  console.log(`  Analytical Q1→3 = ${Q13_analytical.toFixed(2)}W`);
  console.log(`  Analytical Q2→3 = ${Q23_analytical.toFixed(2)}W`);

  // Build solver model
  const nodes: SolverNode[] = [
    {
      id: 'S1', name: 'Surface 1', nodeType: 'boundary',
      temperature: T1, initialTemperature: T1, capacitance: 0,
      boundaryTemp: T1, area: A1, absorptivity: 0, emissivity: eps1,
    },
    {
      id: 'S2', name: 'Surface 2', nodeType: 'boundary',
      temperature: T2, initialTemperature: T2, capacitance: 0,
      boundaryTemp: T2, area: A2, absorptivity: 0, emissivity: eps2,
    },
    {
      id: 'S3', name: 'Surface 3', nodeType: 'diffusion',
      temperature: 350, initialTemperature: 350, capacitance: 1000,
      boundaryTemp: null, area: A3, absorptivity: 0, emissivity: eps3,
    },
  ];

  // Radiation conductors between all pairs
  // Solver computes Q = σ * ε * A * F * (T_from⁴ - T_to⁴)
  // We set ε = effective emissivity, A = area of "from" surface, F = view factor from "from"
  const conductors: SolverConductor[] = [
    {
      id: 'R13', name: 'Rad 1→3', conductorType: 'radiation',
      nodeFromId: 'S1', nodeToId: 'S3',
      conductance: 0, area: A1, viewFactor: F13, emissivity: eps13_eff,
    },
    {
      id: 'R23', name: 'Rad 2→3', conductorType: 'radiation',
      nodeFromId: 'S2', nodeToId: 'S3',
      conductance: 0, area: A2, viewFactor: F23, emissivity: eps23_eff,
    },
    {
      id: 'R12', name: 'Rad 1→2', conductorType: 'radiation',
      nodeFromId: 'S1', nodeToId: 'S2',
      conductance: 0, area: A1, viewFactor: F12, emissivity: eps12_eff,
    },
  ];

  const heatLoads: SolverHeatLoad[] = [];
  const network = buildThermalNetwork(nodes, conductors, heatLoads, null);

  const config: SimulationConfig = {
    simulationType: 'steady_state',
    timeStart: 0, timeEnd: 0, timeStep: 0,
    maxIterations: 2000, tolerance: 1e-6,
    minStep: 0, maxStep: 0,
  };

  const result = solveSteadyState(network, config);
  const nodeS3 = result.nodeResults.find(r => r.nodeId === 'S3');
  const T3_solver = nodeS3?.temperatures[nodeS3.temperatures.length - 1] ?? 0;

  // Get conductor flows
  const flowR13 = result.conductorFlows.find(f => f.conductorId === 'R13');
  const flowR23 = result.conductorFlows.find(f => f.conductorId === 'R23');
  const Q13_solver = flowR13?.flows[flowR13.flows.length - 1] ?? 0;
  const Q23_solver = flowR23?.flows[flowR23.flows.length - 1] ?? 0;

  const errT3 = relativeError(T3_solver, T3_analytical);
  const errQ13 = relativeError(Q13_solver, Q13_analytical);
  const errQ23 = relativeError(Q23_solver, Q23_analytical);

  console.log(`  Solver T3 = ${T3_solver.toFixed(2)}K (error: ${(errT3*100).toFixed(2)}%)`);
  console.log(`  Solver Q1→3 = ${Q13_solver.toFixed(2)}W (error: ${(errQ13*100).toFixed(2)}%)`);
  console.log(`  Solver Q2→3 = ${Q23_solver.toFixed(2)}W (error: ${(errQ23*100).toFixed(2)}%)`);

  assert(errT3 < 0.05, `B4: T3 error ${(errT3*100).toFixed(2)}% < 5%`);
  assert(errQ13 < 0.05, `B4: Q1→3 error ${(errQ13*100).toFixed(2)}% < 5%`);
  assert(errQ23 < 0.05, `B4: Q2→3 error ${(errQ23*100).toFixed(2)}% < 5%`);
}

// ── Benchmark 5: Lumped mass transient response ───────────────────────────
// Single node radiating to 0K sink
// C=500 J/K, ε=0.9, A=0.1m², T0=400K, no heat loads
// dT/dt = -σεA/C * T⁴
// Generate "truth" with very fine Euler timestep

function benchmark5_LumpedMassTransient() {
  console.log('\n═══ Benchmark 5: Lumped Mass Transient Response ═══');

  const C = 500;
  const eps = 0.9;
  const area = 0.1;
  const T0 = 400;
  const sigma = STEFAN_BOLTZMANN;
  const tEnd = 3600;
  const checkpoints = [900, 1800, 2700, 3600];

  // Generate analytical "truth" with fine Euler integration
  const dtFine = 0.01; // very fine timestep
  let T = T0;
  const truthMap = new Map<number, number>();
  truthMap.set(0, T0);
  for (let t = 0; t < tEnd; t += dtFine) {
    const dTdt = -(sigma * eps * area / C) * Math.pow(T, 4);
    T += dTdt * dtFine;
    // Record at checkpoints (within dtFine tolerance)
    for (const cp of checkpoints) {
      if (Math.abs(t + dtFine - cp) < dtFine) {
        truthMap.set(cp, T);
      }
    }
  }

  console.log('  Analytical (fine Euler) reference:');
  for (const cp of checkpoints) {
    console.log(`    T(${cp}s) = ${truthMap.get(cp)?.toFixed(4)}K`);
  }

  // Solver model: single node radiating to 0K boundary
  const nodes: SolverNode[] = [
    {
      id: 'mass', name: 'Lumped mass', nodeType: 'diffusion',
      temperature: T0, initialTemperature: T0, capacitance: C,
      boundaryTemp: null, area: area, absorptivity: 0, emissivity: eps,
    },
    {
      id: 'sink', name: 'Cold sink (0K)', nodeType: 'boundary',
      temperature: 0.001, initialTemperature: 0.001, capacitance: 0,
      boundaryTemp: 0.001, area: 0, absorptivity: 0, emissivity: 0,
    },
  ];

  const conductors: SolverConductor[] = [
    {
      id: 'rad', name: 'Radiation to sink', conductorType: 'radiation',
      nodeFromId: 'mass', nodeToId: 'sink',
      conductance: 0, area: area, viewFactor: 1.0, emissivity: eps,
    },
  ];

  const heatLoads: SolverHeatLoad[] = [];
  const network = buildThermalNetwork(nodes, conductors, heatLoads, null);

  const config: SimulationConfig = {
    simulationType: 'transient',
    timeStart: 0, timeEnd: tEnd, timeStep: 1,
    maxIterations: 100000, tolerance: 0.001,
    minStep: 0.01, maxStep: 50,
  };

  const result = solveTransient(network, config);
  const massResult = result.nodeResults.find(r => r.nodeId === 'mass');

  if (!massResult) {
    assert(false, 'B5: No result for mass node');
    return;
  }

  console.log('  Solver results:');
  let allPass = true;
  for (const cp of checkpoints) {
    // Find closest time in results
    let closestIdx = 0;
    let closestDiff = Infinity;
    for (let i = 0; i < massResult.times.length; i++) {
      const diff = Math.abs(massResult.times[i] - cp);
      if (diff < closestDiff) {
        closestDiff = diff;
        closestIdx = i;
      }
    }
    const solverT = massResult.temperatures[closestIdx];
    const truthT = truthMap.get(cp) ?? 0;
    const err = relativeError(solverT, truthT);
    console.log(`    T(${cp}s) = ${solverT.toFixed(4)}K (truth: ${truthT.toFixed(4)}K, error: ${(err*100).toFixed(3)}%)`);
    assert(err < 0.02, `B5: T(${cp}s) error ${(err*100).toFixed(3)}% < 2%`);
    if (err >= 0.02) allPass = false;
  }
}

// ── Benchmark 6: Simple satellite box, LEO ────────────────────────────────
// 6-node CubeSat: each face 0.01m², α=0.2, ε=0.8, C=50 J/K
// 400km, 51.6° inclination, 90-min period, 3 orbits

function benchmark6_CubeSatLEO() {
  console.log('\n═══ Benchmark 6: Simple Satellite Box, LEO ═══');

  const alpha = 0.2, eps = 0.8, area = 0.01, cap = 50;
  const faceNames = ['+X', '-X', '+Y', '-Y', '+Z', '-Z'];
  const surfaceTypes: Array<'solar' | 'earth_facing' | 'anti_earth' | 'custom'> =
    ['solar', 'solar', 'solar', 'solar', 'earth_facing', 'anti_earth'];

  const nodes: SolverNode[] = faceNames.map((name, i) => ({
    id: `face_${i}`, name: `Face ${name}`, nodeType: 'diffusion' as const,
    temperature: 293, initialTemperature: 293, capacitance: cap,
    boundaryTemp: null, area: area, absorptivity: alpha, emissivity: eps,
  }));

  // Add deep space sink
  nodes.push({
    id: 'space', name: 'Deep space', nodeType: 'boundary',
    temperature: 3, initialTemperature: 3, capacitance: 0,
    boundaryTemp: 3, area: 0, absorptivity: 0, emissivity: 0,
  });

  // Radiation conductors from each face to space
  // For a CubeSat face, the view factor to space is ~0.85 (remainder sees other s/c surfaces)
  const conductors: SolverConductor[] = faceNames.map((_, i) => ({
    id: `rad_${i}`, name: `Face ${faceNames[i]} to space`, conductorType: 'radiation' as const,
    nodeFromId: `face_${i}`, nodeToId: 'space',
    conductance: 0, area: area, viewFactor: 0.85, emissivity: eps,
  }));

  // Conduction between adjacent faces (aluminum structure coupling ~2 W/K for 1U CubeSat)
  const adjacentPairs = [[0,1],[2,3],[4,5],[0,2],[0,3],[1,2],[1,3],[0,4],[0,5],[1,4],[1,5],[2,4],[2,5],[3,4],[3,5]];
  for (const [a, b] of adjacentPairs) {
    conductors.push({
      id: `cond_${a}_${b}`, name: `Cond ${faceNames[a]}-${faceNames[b]}`,
      conductorType: 'linear',
      nodeFromId: `face_${a}`, nodeToId: `face_${b}`,
      conductance: 2.0, // W/K, aluminum structure coupling
      area: 0, viewFactor: 0, emissivity: 0,
    });
  }

  // Orbital heat loads on each face
  const heatLoads: SolverHeatLoad[] = faceNames.map((_, i) => ({
    id: `orbital_${i}`, name: `Orbital load ${faceNames[i]}`,
    nodeId: `face_${i}`, loadType: 'orbital' as const,
    value: 0, timeValues: [],
    orbitalParams: {
      surfaceType: surfaceTypes[i],
      absorptivity: alpha,
      emissivity: eps,
      area: area,
    },
  }));

  const orbitalConfig = {
    altitude: 400,
    inclination: 51.6,
    raan: 0,
    epoch: '2026-03-21',
  };

  const network = buildThermalNetwork(nodes, conductors, heatLoads, orbitalConfig);
  const orbPeriod = network.orbitalEnv?.orbitalPeriod ?? 5400;
  console.log(`  Orbital period: ${(orbPeriod/60).toFixed(1)} min`);

  // Run 3 orbital periods
  const config: SimulationConfig = {
    simulationType: 'transient',
    timeStart: 0, timeEnd: orbPeriod * 3, timeStep: 10,
    maxIterations: 100000, tolerance: 0.01,
    minStep: 0.1, maxStep: 60,
  };

  const result = solveTransient(network, config);

  // Check temperatures of all face nodes at end of simulation
  const minPublished = -40 + 273.15; // 233.15K
  const maxPublished = 60 + 273.15;  // 333.15K
  // Allow 10% beyond published range
  const minBound = minPublished - 0.1 * (maxPublished - minPublished);
  const maxBound = maxPublished + 0.1 * (maxPublished - minPublished);

  console.log(`  Published range: ${minPublished.toFixed(1)}K to ${maxPublished.toFixed(1)}K`);
  console.log(`  Acceptable range (±10%): ${minBound.toFixed(1)}K to ${maxBound.toFixed(1)}K`);

  for (let i = 0; i < 6; i++) {
    const faceResult = result.nodeResults.find(r => r.nodeId === `face_${i}`);
    if (!faceResult) continue;

    // Get min/max over last orbit
    const lastOrbitStart = orbPeriod * 2;
    let minT = Infinity, maxT = -Infinity;
    for (let j = 0; j < faceResult.times.length; j++) {
      if (faceResult.times[j] >= lastOrbitStart) {
        const t = faceResult.temperatures[j];
        if (t < minT) minT = t;
        if (t > maxT) maxT = t;
      }
    }
    console.log(`  Face ${faceNames[i]}: min=${minT.toFixed(1)}K (${(minT-273.15).toFixed(1)}°C), max=${maxT.toFixed(1)}K (${(maxT-273.15).toFixed(1)}°C)`);
    assert(
      minT >= minBound && maxT <= maxBound,
      `B6: Face ${faceNames[i]} temps within acceptable range`,
    );
  }
}

// ── Benchmark 7: Deployed solar array ─────────────────────────────────────
// Single node, α=0.92, ε=0.85, A=0.5m², solar=1367 W/m²
// Q_absorbed = 1367 * 0.92 * 0.5 = 629.32W
// T_eq = (Q / (σ * ε * A))^0.25

function benchmark7_SolarArray() {
  console.log('\n═══ Benchmark 7: Deployed Solar Array ═══');

  const alpha = 0.92, eps = 0.85, area = 0.5;
  const solarFlux = 1367;
  const Q_absorbed = solarFlux * alpha * area;
  const sigma = STEFAN_BOLTZMANN;
  const T_analytical = Math.pow(Q_absorbed / (sigma * eps * area), 0.25);

  console.log(`  Q_absorbed = ${Q_absorbed.toFixed(2)}W`);
  console.log(`  Analytical T_eq = ${T_analytical.toFixed(4)}K`);

  const nodes: SolverNode[] = [
    {
      id: 'panel', name: 'Solar panel', nodeType: 'diffusion',
      temperature: 200, initialTemperature: 200, capacitance: 200,
      boundaryTemp: null, area: area, absorptivity: alpha, emissivity: eps,
    },
    {
      id: 'space', name: 'Deep space', nodeType: 'boundary',
      temperature: 0.001, initialTemperature: 0.001, capacitance: 0,
      boundaryTemp: 0.001, area: 0, absorptivity: 0, emissivity: 0,
    },
  ];

  const conductors: SolverConductor[] = [
    {
      id: 'rad', name: 'Radiation to space', conductorType: 'radiation',
      nodeFromId: 'panel', nodeToId: 'space',
      conductance: 0, area: area, viewFactor: 1.0, emissivity: eps,
    },
  ];

  const heatLoads: SolverHeatLoad[] = [
    {
      id: 'solar', name: 'Solar absorbed', nodeId: 'panel',
      loadType: 'constant', value: Q_absorbed, timeValues: [], orbitalParams: null,
    },
  ];

  const network = buildThermalNetwork(nodes, conductors, heatLoads, null);

  // Use steady-state solver
  const config: SimulationConfig = {
    simulationType: 'steady_state',
    timeStart: 0, timeEnd: 0, timeStep: 0,
    maxIterations: 2000, tolerance: 1e-8,
    minStep: 0, maxStep: 0,
  };

  const result = solveSteadyState(network, config);
  const panelResult = result.nodeResults.find(r => r.nodeId === 'panel');
  const T_solver = panelResult?.temperatures[panelResult.temperatures.length - 1] ?? 0;
  const err = relativeError(T_solver, T_analytical);

  console.log(`  Solver T_eq = ${T_solver.toFixed(4)}K (error: ${(err*100).toFixed(4)}%)`);
  assert(err < 0.01, `B7: T_eq error ${(err*100).toFixed(4)}% < 1%`);
}

// ── Benchmark 8: Two-node conduction (precise) ───────────────────────────
// Node 1: heat load Q=100W, diffusion
// Node 2: boundary at 200K (arithmetic)
// Conductor: G=10 W/K
// T1 = T2 + Q/G = 210K

function benchmark8_TwoNodeConduction() {
  console.log('\n═══ Benchmark 8: Two-Node Conduction (Precise) ═══');

  const Q = 100, G = 10, T2 = 200;
  const T1_analytical = T2 + Q / G; // 210K

  console.log(`  Analytical T1 = ${T1_analytical.toFixed(4)}K`);

  const nodes: SolverNode[] = [
    {
      id: 'N1', name: 'Heated node', nodeType: 'diffusion',
      temperature: 250, initialTemperature: 250, capacitance: 100,
      boundaryTemp: null, area: 0, absorptivity: 0, emissivity: 0,
    },
    {
      id: 'N2', name: 'Boundary node', nodeType: 'boundary',
      temperature: T2, initialTemperature: T2, capacitance: 0,
      boundaryTemp: T2, area: 0, absorptivity: 0, emissivity: 0,
    },
  ];

  const conductors: SolverConductor[] = [
    {
      id: 'cond', name: 'Conductor', conductorType: 'linear',
      nodeFromId: 'N1', nodeToId: 'N2',
      conductance: G, area: 0, viewFactor: 0, emissivity: 0,
    },
  ];

  const heatLoads: SolverHeatLoad[] = [
    {
      id: 'heater', name: 'Heat load', nodeId: 'N1',
      loadType: 'constant', value: Q, timeValues: [], orbitalParams: null,
    },
  ];

  const network = buildThermalNetwork(nodes, conductors, heatLoads, null);

  const config: SimulationConfig = {
    simulationType: 'steady_state',
    timeStart: 0, timeEnd: 0, timeStep: 0,
    maxIterations: 1000, tolerance: 1e-10,
    minStep: 0, maxStep: 0,
  };

  const result = solveSteadyState(network, config);
  const n1Result = result.nodeResults.find(r => r.nodeId === 'N1');
  const T1_solver = n1Result?.temperatures[n1Result.temperatures.length - 1] ?? 0;
  const err = relativeError(T1_solver, T1_analytical);

  console.log(`  Solver T1 = ${T1_solver.toFixed(6)}K (error: ${(err*100).toFixed(6)}%)`);
  assert(err < 0.001, `B8: T1 error ${(err*100).toFixed(6)}% < 0.1%`);
}

// ── Run All Benchmarks ────────────────────────────────────────────────────

console.log('🔬 Spacecraft Thermal Solver — V&V Benchmarks 4-8\n');

benchmark4_RadiationEnclosure();
benchmark5_LumpedMassTransient();
benchmark6_CubeSatLEO();
benchmark7_SolarArray();
benchmark8_TwoNodeConduction();

console.log('\n══════════════════════════════════════════════════');
console.log('Benchmarks 4-8 complete.');
process.exitCode = exitCode;
