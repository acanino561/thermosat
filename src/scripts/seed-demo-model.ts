/**
 * Seed script: Creates the TFAWS demo model — "3U CubeSat LEO Hot Case"
 * 
 * Idempotent: safe to run multiple times. Deletes and recreates if exists.
 * Run with: pnpm db:seed:demo
 */

import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import {
  users,
  projects,
  thermalModels,
  thermalNodes,
  conductors,
  heatLoads,
  simulationRuns,
  simulationResults,
  sensitivityMatrices,
} from '../lib/db/schema';
import { buildThermalNetwork, runSimulation } from '../lib/solver/thermal-network';
import { computeSensitivityMatrix } from '../lib/solver/sensitivity';
import type { SimulationConfig, OrbitalConfig } from '../lib/solver/types';
import type { ConductanceData } from '../lib/db/schema';

// ── Fixed IDs for idempotency ──────────────────────────────────────────────
const DEMO_USER_ID = 'a0000000-0000-4000-8000-000000000001';
const DEMO_PROJECT_ID = 'a0000000-0000-4000-8000-000000000002';
const DEMO_MODEL_ID = 'a0000000-0000-4000-8000-000000000003';

const DB_URL = process.env.DATABASE_URL
  || 'postgresql://neondb_owner:npg_7YnrI4hjxXfk@ep-frosty-night-ae85q5kd.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require';

// ── Node definitions ───────────────────────────────────────────────────────
interface NodeDef {
  name: string;
  mass: number;
  cp: number;
  alpha: number;
  eps: number;
  q: number;
  area: number;
  boundary?: boolean;
  boundaryTemp?: number;
}

const NODE_DEFS: NodeDef[] = [
  { name: '+X Panel (solar)',  mass: 0.08, cp: 900,  alpha: 0.92, eps: 0.85, q: 0, area: 0.03 },
  { name: '-X Panel',          mass: 0.08, cp: 900,  alpha: 0.15, eps: 0.85, q: 0, area: 0.03 },
  { name: '+Y Panel (solar)',  mass: 0.08, cp: 900,  alpha: 0.92, eps: 0.85, q: 0, area: 0.03 },
  { name: '-Y Panel',          mass: 0.08, cp: 900,  alpha: 0.15, eps: 0.85, q: 0, area: 0.03 },
  { name: '+Z Panel (radiator)', mass: 0.06, cp: 900, alpha: 0.10, eps: 0.85, q: 0, area: 0.01 },
  { name: '-Z Panel (deploy)', mass: 0.06, cp: 900,  alpha: 0.15, eps: 0.85, q: 0, area: 0.01 },
  { name: 'OBC',               mass: 0.15, cp: 900,  alpha: 0,    eps: 0.5,  q: 3.5, area: 0.005 },
  { name: 'Battery',           mass: 0.25, cp: 1000, alpha: 0,    eps: 0.5,  q: 1.5, area: 0.008 },
  { name: 'RF Transceiver',    mass: 0.10, cp: 900,  alpha: 0,    eps: 0.5,  q: 4.0, area: 0.004 },
  { name: 'Payload',           mass: 0.20, cp: 900,  alpha: 0,    eps: 0.5,  q: 8.0, area: 0.006 },
  { name: 'Separation Ring',   mass: 0.12, cp: 900,  alpha: 0.15, eps: 0.85, q: 0, area: 0.005 },
  { name: 'MLI Layer',         mass: 0.05, cp: 1200, alpha: 0.05, eps: 0.02, q: 0, area: 0.02 },
  // Boundary node — deep space sink (index 12)
  { name: 'Deep Space',        mass: 0,    cp: 0,    alpha: 0,    eps: 0,    q: 0, area: 0, boundary: true, boundaryTemp: 2.7 },
];

// ── Conductor definitions (by node index) ──────────────────────────────────
// N01=0, N02=1, ..., N12=11
const HEAT_PIPE_CURVE: ConductanceData = {
  points: [
    { temperature: 270, conductance: 1.0 },
    { temperature: 290, conductance: 8.0 },
    { temperature: 310, conductance: 8.0 },
    { temperature: 330, conductance: 1.0 },
  ],
};

interface ConductorDef {
  from: number;
  to: number;
  type: 'linear' | 'radiation' | 'contact' | 'heat_pipe';
  conductance?: number;
  viewFactor?: number;
  conductanceData?: ConductanceData;
}

const CONDUCTOR_DEFS: ConductorDef[] = [
  // 8 conductive (linear)
  { from: 0, to: 6, type: 'linear', conductance: 0.5 },
  { from: 1, to: 6, type: 'linear', conductance: 0.3 },
  { from: 2, to: 7, type: 'linear', conductance: 0.4 },
  { from: 3, to: 7, type: 'linear', conductance: 0.3 },
  { from: 4, to: 8, type: 'linear', conductance: 0.6 },
  { from: 5, to: 9, type: 'linear', conductance: 0.5 },
  { from: 6, to: 7, type: 'linear', conductance: 1.2 },
  { from: 8, to: 9, type: 'linear', conductance: 0.8 },
  // 6 radiative
  { from: 0, to: 4, type: 'radiation', viewFactor: 0.12 },
  { from: 2, to: 4, type: 'radiation', viewFactor: 0.15 },
  { from: 6, to: 4, type: 'radiation', viewFactor: 0.20 },
  { from: 7, to: 4, type: 'radiation', viewFactor: 0.18 },
  { from: 8, to: 4, type: 'radiation', viewFactor: 0.10 },
  { from: 9, to: 4, type: 'radiation', viewFactor: 0.08 },
  // 2 heat pipe
  { from: 6, to: 4, type: 'heat_pipe', conductanceData: HEAT_PIPE_CURVE },
  { from: 7, to: 4, type: 'heat_pipe', conductanceData: HEAT_PIPE_CURVE },
  // 2 contact
  { from: 6, to: 11, type: 'contact', conductance: 2.0 },
  { from: 7, to: 11, type: 'contact', conductance: 1.5 },
  // Radiation to deep space (index 12) — all external surfaces
  { from: 0,  to: 12, type: 'radiation', viewFactor: 0.85 },  // +X Panel → space
  { from: 1,  to: 12, type: 'radiation', viewFactor: 0.85 },  // -X Panel → space
  { from: 2,  to: 12, type: 'radiation', viewFactor: 0.85 },  // +Y Panel → space
  { from: 3,  to: 12, type: 'radiation', viewFactor: 0.85 },  // -Y Panel → space
  { from: 4,  to: 12, type: 'radiation', viewFactor: 0.90 },  // +Z Radiator → space (good view)
  { from: 5,  to: 12, type: 'radiation', viewFactor: 0.85 },  // -Z Panel → space
  { from: 10, to: 12, type: 'radiation', viewFactor: 0.50 },  // Separation Ring → space
  { from: 11, to: 12, type: 'radiation', viewFactor: 0.30 },  // MLI Layer → space (low eps)
];

async function seedDemo(): Promise<void> {
  // Set DATABASE_URL early so the sensitivity module's db client works
  process.env.DATABASE_URL = DB_URL;
  
  const sql = neon(DB_URL);
  const seedDb = drizzle(sql);

  console.log('🛰️  Seeding TFAWS Demo Model — 3U CubeSat LEO Hot Case');
  console.log('');

  // ── Step 1: Clean up existing demo data ──────────────────────────────
  console.log('  Cleaning up existing demo data...');
  
  // Cascade delete from user removes projects → models → nodes → conductors → etc.
  try {
    await seedDb.delete(users).where(eq(users.id, DEMO_USER_ID));
    console.log('    ✓ Cleaned up existing demo data');
  } catch {
    console.log('    (no existing demo data)');
  }

  // ── Step 2: Create demo user ─────────────────────────────────────────
  console.log('  Creating demo user...');
  // Use raw SQL to avoid column mismatch if DB schema is behind
  await sql(`INSERT INTO users (id, name, email) VALUES ($1, $2, $3)`, [
    DEMO_USER_ID,
    'Verixos Demo',
    'demo@verixos.com',
  ]);

  // ── Step 3: Create demo project ──────────────────────────────────────
  console.log('  Creating demo project...');
  await seedDb.insert(projects).values({
    id: DEMO_PROJECT_ID,
    userId: DEMO_USER_ID,
    name: '3U CubeSat Demo — LEO Hot Case',
    description: 'Pre-built demo: 12-node 3U CubeSat thermal model at 550 km LEO, hot case (no eclipse, 1414 W/m² solar flux). Includes OBC, battery, RF transceiver, payload, and MLI layer with heat pipe thermal control.',
    isDemo: true,
  });

  // ── Step 4: Create thermal model ─────────────────────────────────────
  console.log('  Creating thermal model...');
  const orbitalConfig: OrbitalConfig = {
    altitude: 550,
    inclination: 51.6,
    raan: 180,              // produces moderate beta angle → some eclipse
    epoch: '2025-03-21T12:00:00Z', // equinox — maximum eclipse duration
  };

  await seedDb.insert(thermalModels).values({
    id: DEMO_MODEL_ID,
    projectId: DEMO_PROJECT_ID,
    name: '3U CubeSat LEO Hot Case',
    description: '12-node thermal model with heat pipes, MLI, and orbital environment',
    orbitalConfig: orbitalConfig as any,
    version: 1,
  });

  // ── Step 5: Create thermal nodes ─────────────────────────────────────
  console.log(`  Creating ${NODE_DEFS.length} thermal nodes...`);
  const nodeIds: string[] = [];
  for (const def of NODE_DEFS) {
    const nodeId = uuidv4();
    nodeIds.push(nodeId);
    await seedDb.insert(thermalNodes).values({
      id: nodeId,
      modelId: DEMO_MODEL_ID,
      name: def.name,
      nodeType: def.boundary ? 'boundary' : 'diffusion',
      temperature: def.boundary ? def.boundaryTemp! : 293,
      capacitance: def.boundary ? null : def.mass * def.cp,
      boundaryTemp: def.boundary ? def.boundaryTemp! : null,
      area: def.area,
      mass: def.mass,
      absorptivity: def.alpha,
      emissivity: def.eps,
    });
    console.log(`    ✓ ${def.name}${def.boundary ? ' (boundary)' : ''}`);
  }

  // ── Step 6: Create conductors ────────────────────────────────────────
  console.log(`  Creating ${CONDUCTOR_DEFS.length} conductors...`);
  for (const def of CONDUCTOR_DEFS) {
    const fromName = NODE_DEFS[def.from].name;
    const toName = NODE_DEFS[def.to].name;
    const label = `${fromName} ↔ ${toName} (${def.type})`;

    await seedDb.insert(conductors).values({
      id: uuidv4(),
      modelId: DEMO_MODEL_ID,
      name: label,
      conductorType: def.type,
      nodeFromId: nodeIds[def.from],
      nodeToId: nodeIds[def.to],
      conductance: def.conductance ?? null,
      area: def.type === 'radiation' ? (NODE_DEFS[def.from].area || 0.01) : null,
      viewFactor: def.viewFactor ?? null,
      emissivity: def.type === 'radiation' ? 0.85 : null,
      conductanceData: def.conductanceData ?? null,
    });
    console.log(`    ✓ ${label}`);
  }

  // ── Step 7: Create heat loads ────────────────────────────────────────
  console.log('  Creating heat loads...');
  
  // Internal dissipation heat loads
  for (let i = 0; i < NODE_DEFS.length; i++) {
    const def = NODE_DEFS[i];
    if (def.q > 0) {
      await seedDb.insert(heatLoads).values({
        id: uuidv4(),
        modelId: DEMO_MODEL_ID,
        nodeId: nodeIds[i],
        name: `${def.name} — Internal Dissipation`,
        loadType: 'constant',
        value: def.q,
      });
      console.log(`    ✓ ${def.name}: ${def.q} W (internal)`);
    }
  }
  
  // Orbital heat loads for external surfaces
  const orbitalSurfaces: Array<{ idx: number; surfaceType: 'solar' | 'earth_facing' | 'anti_earth' }> = [
    { idx: 0, surfaceType: 'solar' },       // +X Panel (solar-facing)
    { idx: 1, surfaceType: 'anti_earth' },   // -X Panel
    { idx: 2, surfaceType: 'solar' },        // +Y Panel (solar-facing)
    { idx: 3, surfaceType: 'anti_earth' },   // -Y Panel
    { idx: 4, surfaceType: 'anti_earth' },   // +Z Radiator (zenith)
    { idx: 5, surfaceType: 'earth_facing' }, // -Z Panel (nadir)
    { idx: 10, surfaceType: 'earth_facing' },// Separation Ring
  ];
  
  for (const surf of orbitalSurfaces) {
    const def = NODE_DEFS[surf.idx];
    await seedDb.insert(heatLoads).values({
      id: uuidv4(),
      modelId: DEMO_MODEL_ID,
      nodeId: nodeIds[surf.idx],
      name: `${def.name} — Orbital Environment`,
      loadType: 'orbital',
      value: 0,
      orbitalParams: {
        surfaceType: surf.surfaceType,
        absorptivity: def.alpha,
        emissivity: def.eps,
        area: def.area,
      },
    });
    console.log(`    ✓ ${def.name}: orbital (${surf.surfaceType})`);
  }

  // ── Step 8: Run simulation ───────────────────────────────────────────
  console.log('  Running transient simulation (1 orbit = 5940s)...');

  // Fetch back what we just inserted (solver needs DB row format)
  const dbNodes = await seedDb.select().from(thermalNodes).where(eq(thermalNodes.modelId, DEMO_MODEL_ID));
  const dbConductors = await seedDb.select().from(conductors).where(eq(conductors.modelId, DEMO_MODEL_ID));
  const dbHeatLoads = await seedDb.select().from(heatLoads).where(eq(heatLoads.modelId, DEMO_MODEL_ID));

  const network = buildThermalNetwork(
    dbNodes as any,
    dbConductors as any,
    dbHeatLoads as any,
    orbitalConfig,
  );

  const simConfig: SimulationConfig = {
    simulationType: 'transient',
    timeStart: 0,
    timeEnd: 5940, // 1 orbital period at 550 km
    timeStep: 10,
    maxIterations: 10000,
    tolerance: 1e-6,
    minStep: 0.1,
    maxStep: 60,
  };

  const startTime = Date.now();
  const result = runSimulation(network, simConfig);
  const elapsed = Date.now() - startTime;
  console.log(`    ✓ Simulation complete in ${elapsed} ms`);
  console.log(`    ✓ Time points: ${result.timePoints.length}, Converged: ${result.converged}`);

  // Print final temperatures
  console.log('');
  console.log('  Final temperatures:');
  for (const nr of result.nodeResults) {
    const node = dbNodes.find(n => n.id === nr.nodeId);
    const finalT = nr.temperatures[nr.temperatures.length - 1];
    console.log(`    ${node?.name?.padEnd(25)} ${finalT.toFixed(1)} K  (${(finalT - 273.15).toFixed(1)} °C)`);
  }

  // ── Step 9: Store results in DB ──────────────────────────────────────
  console.log('');
  console.log('  Storing simulation run...');
  const runId = uuidv4();
  await seedDb.insert(simulationRuns).values({
    id: runId,
    modelId: DEMO_MODEL_ID,
    status: 'completed',
    simulationType: 'transient',
    config: {
      timeStart: 0,
      timeEnd: 5940,
      timeStep: 10,
      maxIterations: 10000,
      tolerance: 1e-6,
    },
    progress: 100,
    startedAt: new Date(),
    completedAt: new Date(),
    energyBalanceError: result.energyBalanceError,
  });

  console.log('  Storing simulation results...');
  for (const nodeResult of result.nodeResults) {
    await seedDb.insert(simulationResults).values({
      runId,
      nodeId: nodeResult.nodeId,
      timeValues: {
        times: nodeResult.times,
        temperatures: nodeResult.temperatures,
      },
      conductorFlows: result.conductorFlows
        .filter(cf => {
          const cond = dbConductors.find(c => c.id === cf.conductorId);
          return cond?.nodeFromId === nodeResult.nodeId || cond?.nodeToId === nodeResult.nodeId;
        })
        .map(cf => ({
          conductorId: cf.conductorId,
          times: cf.times,
          flows: cf.flows,
        })),
    });
  }
  console.log('    ✓ Results stored');

  // ── Step 10: Compute sensitivity matrix ──────────────────────────────
  console.log('  Computing sensitivity matrix...');
  const [sensRow] = await seedDb
    .insert(sensitivityMatrices)
    .values({
      runId,
      status: 'pending',
    })
    .returning();

  await computeSensitivityMatrix(
    sensRow.id,
    dbNodes as any,
    dbConductors as any,
    dbHeatLoads as any,
    orbitalConfig,
  );
  console.log('    ✓ Sensitivity matrix computed');

  console.log('');
  console.log('🎉 Demo model seeded successfully!');
  console.log(`   Project: ${DEMO_PROJECT_ID}`);
  console.log(`   Model:   ${DEMO_MODEL_ID}`);
  console.log(`   Run:     ${runId}`);
  console.log('');
  console.log(`   Open: /dashboard/projects/${DEMO_PROJECT_ID}/models/${DEMO_MODEL_ID}`);
}

seedDemo().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
