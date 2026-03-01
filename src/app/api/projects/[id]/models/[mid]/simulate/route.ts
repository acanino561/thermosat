import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import {
  thermalModels,
  thermalNodes,
  conductors,
  heatLoads,
  simulationRuns,
  simulationResults,
} from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { runSimulationSchema } from '@/lib/validators/simulation';
import {
  getAuthenticatedUser,
  unauthorizedResponse,
  notFoundResponse,
  validationErrorResponse,
  serverErrorResponse,
  parseJsonBody,
  forbiddenResponse,
} from '@/lib/utils/api-helpers';
import { getUserProjectAccess, requireRole, AccessDeniedError } from '@/lib/auth/access';
import { buildThermalNetwork, runSimulation } from '@/lib/solver/thermal-network';
import { computeEnergyBalance } from '@/lib/solver/energy-balance';
import { computeSensitivityMatrix } from '@/lib/solver/sensitivity';
import { sensitivityMatrices } from '@/lib/db/schema';
import type { OrbitalConfig, SimulationConfig } from '@/lib/solver/types';

interface RouteParams {
  params: Promise<{ id: string; mid: string }>;
}

const MAX_SIMULATION_TIME_MS = 30000; // 30 seconds timeout

export async function POST(
  request: Request,
  { params }: RouteParams,
): Promise<NextResponse> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const { id, mid } = await params;

    let role;
    try {
      role = await getUserProjectAccess(user.id, id);
    } catch (e) {
      if (e instanceof AccessDeniedError) return forbiddenResponse();
      throw e;
    }

    try {
      requireRole(role, 'editor');
    } catch {
      return forbiddenResponse();
    }

    // Get model
    const [model] = await db
      .select()
      .from(thermalModels)
      .where(
        and(eq(thermalModels.id, mid), eq(thermalModels.projectId, id)),
      );
    if (!model) return notFoundResponse('Model');

    // Parse request body
    const body = await parseJsonBody(request);
    if (!body) {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 },
      );
    }

    const parsed = runSimulationSchema.safeParse(body);
    if (!parsed.success) {
      return validationErrorResponse(parsed.error);
    }

    // Fetch model data
    const nodes = await db
      .select()
      .from(thermalNodes)
      .where(eq(thermalNodes.modelId, mid));

    if (nodes.length === 0) {
      return NextResponse.json(
        { error: 'Model has no nodes. Add at least one node before simulating.' },
        { status: 400 },
      );
    }

    const modelConductors = await db
      .select()
      .from(conductors)
      .where(eq(conductors.modelId, mid));

    const loads = await db
      .select()
      .from(heatLoads)
      .where(eq(heatLoads.modelId, mid));

    // Create simulation run record
    const [run] = await db
      .insert(simulationRuns)
      .values({
        modelId: mid,
        configId: (parsed.data as any).configId ?? null,
        status: 'running',
        simulationType: parsed.data.simulationType,
        config: parsed.data.config,
        progress: 0,
        startedAt: new Date(),
      })
      .returning();

    try {
      // Update progress to 10% — model loaded, network being built
      await db
        .update(simulationRuns)
        .set({ progress: 10 })
        .where(eq(simulationRuns.id, run.id));

      // Build thermal network
      const network = buildThermalNetwork(
        nodes,
        modelConductors,
        loads,
        (model.orbitalConfig as OrbitalConfig) ?? null,
      );

      // Update progress to 20% — network built, starting solver
      await db
        .update(simulationRuns)
        .set({ progress: 20 })
        .where(eq(simulationRuns.id, run.id));

      // Configure solver
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

      // Check if run has been cancelled before starting solver
      const [currentRun] = await db
        .select({ status: simulationRuns.status })
        .from(simulationRuns)
        .where(eq(simulationRuns.id, run.id));
      if (currentRun?.status === 'cancelled') {
        return NextResponse.json({
          run: { ...run, status: 'cancelled' },
          summary: { cancelled: true },
        });
      }

      // Run simulation
      const startTime = Date.now();
      const result = runSimulation(network, simConfig);
      const elapsed = Date.now() - startTime;

      // Update progress to 80% — solver done, storing results
      await db
        .update(simulationRuns)
        .set({ progress: 80 })
        .where(eq(simulationRuns.id, run.id));

      if (elapsed > MAX_SIMULATION_TIME_MS) {
        await db
          .update(simulationRuns)
          .set({
            status: 'failed',
            completedAt: new Date(),
            progress: 100,
            errorMessage: 'Simulation exceeded time limit',
          })
          .where(eq(simulationRuns.id, run.id));

        return NextResponse.json(
          { error: 'Simulation exceeded time limit' },
          { status: 408 },
        );
      }

      // Compute energy balance
      const energyBalance = computeEnergyBalance(network, result);

      // Store results — batched inserts for performance
      const BATCH_SIZE = 100;
      const resultValues = result.nodeResults.map((nodeResult) => ({
        runId: run.id,
        nodeId: nodeResult.nodeId,
        timeValues: {
          times: nodeResult.times,
          temperatures: nodeResult.temperatures,
        },
        conductorFlows: result.conductorFlows
          .filter((cf) => {
            const conductor = network.conductors.find(
              (c) => c.id === cf.conductorId,
            );
            return (
              conductor?.nodeFromId === nodeResult.nodeId ||
              conductor?.nodeToId === nodeResult.nodeId
            );
          })
          .map((cf) => ({
            conductorId: cf.conductorId,
            times: cf.times,
            flows: cf.flows,
          })),
      }));

      // Insert in batches
      for (let i = 0; i < resultValues.length; i += BATCH_SIZE) {
        const batch = resultValues.slice(i, i + BATCH_SIZE);
        await db.insert(simulationResults).values(batch);

        // Update progress between 80-95% during DB writes
        const writeProgress = 80 + Math.floor((i / resultValues.length) * 15);
        await db
          .update(simulationRuns)
          .set({ progress: writeProgress })
          .where(eq(simulationRuns.id, run.id));
      }

      // Update run status — completed
      await db
        .update(simulationRuns)
        .set({
          status: 'completed',
          completedAt: new Date(),
          progress: 100,
          energyBalanceError: energyBalance.relativeError,
        })
        .where(eq(simulationRuns.id, run.id));

      // Kick off sensitivity computation in background (non-blocking)
      try {
        const [sensRow] = await db
          .insert(sensitivityMatrices)
          .values({
            runId: run.id,
            status: 'pending',
          })
          .returning();

        // Fire and forget — runs after response is sent
        setTimeout(() => {
          computeSensitivityMatrix(
            sensRow.id,
            nodes,
            modelConductors,
            loads,
            (model.orbitalConfig as OrbitalConfig) ?? null,
          ).catch((err) => {
            console.error('Background sensitivity computation error:', err);
          });
        }, 0);
      } catch (sensErr) {
        // Sensitivity failure should never block the simulation response
        console.error('Failed to initiate sensitivity computation:', sensErr);
      }

      return NextResponse.json({
        run: {
          ...run,
          status: 'completed',
          completedAt: new Date(),
          progress: 100,
          energyBalanceError: energyBalance.relativeError,
        },
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
      });
    } catch (simError) {
      const errorMessage =
        simError instanceof Error ? simError.message : 'Unknown simulation error';

      await db
        .update(simulationRuns)
        .set({
          status: 'failed',
          completedAt: new Date(),
          progress: 100,
          errorMessage,
        })
        .where(eq(simulationRuns.id, run.id));

      return NextResponse.json(
        {
          error: 'Simulation failed',
          details: errorMessage,
          runId: run.id,
        },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error('POST /api/.../simulate error:', error);
    return serverErrorResponse();
  }
}
