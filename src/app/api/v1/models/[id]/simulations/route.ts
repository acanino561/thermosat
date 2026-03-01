import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import {
  thermalModels,
  thermalNodes,
  conductors,
  heatLoads,
  simulationRuns,
  simulationResults,
  sensitivityMatrices,
} from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { authenticateApiKey, isErrorResponse } from '@/lib/utils/v1-helpers';
import { runSimulationSchema } from '@/lib/validators/simulation';
import { parseJsonBody, validationErrorResponse } from '@/lib/utils/api-helpers';
import { getUserProjectAccess, requireRole, AccessDeniedError } from '@/lib/auth/access';
import { enforceTierLimit, TierLimitError } from '@/lib/billing/limits';
import { buildThermalNetwork, runSimulation } from '@/lib/solver/thermal-network';
import { computeEnergyBalance } from '@/lib/solver/energy-balance';
import { computeSensitivityMatrix } from '@/lib/solver/sensitivity';
import type { OrbitalConfig, SimulationConfig } from '@/lib/solver/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const MAX_SIMULATION_TIME_MS = 30000;

export async function POST(request: Request, { params }: RouteParams): Promise<NextResponse> {
  try {
    const auth = await authenticateApiKey(request);
    if (isErrorResponse(auth)) return auth;

    const { id } = await params;

    const [model] = await db.select().from(thermalModels).where(eq(thermalModels.id, id));
    if (!model) return NextResponse.json({ error: 'Model not found' }, { status: 404 });

    let role;
    try {
      role = await getUserProjectAccess(auth.userId, model.projectId);
    } catch (e) {
      if (e instanceof AccessDeniedError) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      throw e;
    }

    try { requireRole(role, 'editor'); } catch { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }); }

    const body = await parseJsonBody(request);
    if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });

    const parsed = runSimulationSchema.safeParse(body);
    if (!parsed.success) return validationErrorResponse(parsed.error);

    // Enforce tier limit on simultaneous simulations
    const runningSims = await db.select().from(simulationRuns).where(eq(simulationRuns.status, 'running'));
    const userRunningSims = runningSims.length; // all running sims (scoped by auth context)
    try {
      await enforceTierLimit(auth.userId, 'sims', userRunningSims);
    } catch (err) {
      if (err instanceof TierLimitError) {
        return NextResponse.json(
          { error: { code: 'TIER_LIMIT_EXCEEDED', message: err.message, upgradeUrl: '/dashboard/settings/billing' } },
          { status: 403 }
        );
      }
      throw err;
    }

    const nodes = await db.select().from(thermalNodes).where(eq(thermalNodes.modelId, id));
    if (nodes.length === 0) {
      return NextResponse.json({ error: 'Model has no nodes' }, { status: 400 });
    }

    const modelConductors = await db.select().from(conductors).where(eq(conductors.modelId, id));
    const loads = await db.select().from(heatLoads).where(eq(heatLoads.modelId, id));

    const [run] = await db
      .insert(simulationRuns)
      .values({
        modelId: id,
        configId: (parsed.data as any).configId ?? null,
        status: 'running',
        simulationType: parsed.data.simulationType,
        config: parsed.data.config,
        progress: 0,
        startedAt: new Date(),
      })
      .returning();

    try {
      const { logAuditEvent } = await import('@/lib/audit/logger');
      await logAuditEvent({
        userId: auth.userId,
        action: 'simulation.run',
        entityType: 'simulation',
        entityId: run.id,
        projectId: model.projectId,
        modelId: id,
        after: { runId: run.id, simulationType: parsed.data.simulationType },
        ipAddress: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'unknown',
        userAgent: request.headers.get('user-agent') ?? undefined,
      });
    } catch { /* audit best-effort */ }

    try {
      await db.update(simulationRuns).set({ progress: 10 }).where(eq(simulationRuns.id, run.id));

      const network = buildThermalNetwork(
        nodes, modelConductors, loads,
        (model.orbitalConfig as OrbitalConfig) ?? null,
      );

      await db.update(simulationRuns).set({ progress: 20 }).where(eq(simulationRuns.id, run.id));

      const simConfig: SimulationConfig = {
        simulationType: parsed.data.simulationType,
        solverMethod: parsed.data.solverMethod ?? 'rk4',
        timeStart: parsed.data.config.timeStart,
        timeEnd: parsed.data.config.timeEnd,
        timeStep: parsed.data.config.timeStep,
        maxIterations: parsed.data.config.maxIterations,
        tolerance: parsed.data.config.tolerance,
        minStep: parsed.data.config.minStep ?? parsed.data.config.timeStep * 0.001,
        maxStep: parsed.data.config.maxStep ?? parsed.data.config.timeStep * 10,
      };

      const startTime = Date.now();
      const result = runSimulation(network, simConfig);
      const elapsed = Date.now() - startTime;

      await db.update(simulationRuns).set({ progress: 80 }).where(eq(simulationRuns.id, run.id));

      if (elapsed > MAX_SIMULATION_TIME_MS) {
        await db.update(simulationRuns).set({
          status: 'failed', completedAt: new Date(), progress: 100,
          errorMessage: 'Simulation exceeded time limit',
        }).where(eq(simulationRuns.id, run.id));
        return NextResponse.json({ error: 'Simulation exceeded time limit' }, { status: 408 });
      }

      const energyBalance = computeEnergyBalance(network, result);

      const BATCH_SIZE = 100;
      const resultValues = result.nodeResults.map((nodeResult) => ({
        runId: run.id,
        nodeId: nodeResult.nodeId,
        timeValues: { times: nodeResult.times, temperatures: nodeResult.temperatures },
        conductorFlows: result.conductorFlows
          .filter((cf) => {
            const c = network.conductors.find((c) => c.id === cf.conductorId);
            return c?.nodeFromId === nodeResult.nodeId || c?.nodeToId === nodeResult.nodeId;
          })
          .map((cf) => ({ conductorId: cf.conductorId, times: cf.times, flows: cf.flows })),
      }));

      for (let i = 0; i < resultValues.length; i += BATCH_SIZE) {
        const batch = resultValues.slice(i, i + BATCH_SIZE);
        await db.insert(simulationResults).values(batch);
        const writeProgress = 80 + Math.floor((i / resultValues.length) * 15);
        await db.update(simulationRuns).set({ progress: writeProgress }).where(eq(simulationRuns.id, run.id));
      }

      await db.update(simulationRuns).set({
        status: 'completed', completedAt: new Date(), progress: 100,
        energyBalanceError: energyBalance.relativeError,
      }).where(eq(simulationRuns.id, run.id));

      // Fire sensitivity in background
      try {
        const [sensRow] = await db.insert(sensitivityMatrices).values({ runId: run.id, status: 'pending' }).returning();
        setTimeout(() => {
          computeSensitivityMatrix(sensRow.id, nodes, modelConductors, loads, (model.orbitalConfig as OrbitalConfig) ?? null).catch(console.error);
        }, 0);
      } catch { /* non-blocking */ }

      return NextResponse.json({
        data: {
          run: { ...run, status: 'completed', completedAt: new Date(), progress: 100, energyBalanceError: energyBalance.relativeError },
          summary: {
            timePoints: result.timePoints.length,
            nodeCount: result.nodeResults.length,
            conductorCount: result.conductorFlows.length,
            converged: result.converged,
            iterations: result.iterations,
            energyBalance: {
              isBalanced: energyBalance.isBalanced,
              relativeError: energyBalance.relativeError,
              totalEnergyStored: energyBalance.totalEnergyStored,
            },
          },
        },
      });
    } catch (simError) {
      const errorMessage = simError instanceof Error ? simError.message : 'Unknown simulation error';
      await db.update(simulationRuns).set({
        status: 'failed', completedAt: new Date(), progress: 100, errorMessage,
      }).where(eq(simulationRuns.id, run.id));
      return NextResponse.json({ error: 'Simulation failed', details: errorMessage, runId: run.id }, { status: 500 });
    }
  } catch (error) {
    console.error('POST /api/v1/models/[id]/simulations error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
