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
  verifyProjectOwnership,
  parseJsonBody,
} from '@/lib/utils/api-helpers';
import { buildThermalNetwork, runSimulation } from '@/lib/solver/thermal-network';
import { computeEnergyBalance } from '@/lib/solver/energy-balance';
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
    const project = await verifyProjectOwnership(id, user.id);
    if (!project) return notFoundResponse('Project');

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
        status: 'running',
        simulationType: parsed.data.simulationType,
        config: parsed.data.config,
        startedAt: new Date(),
      })
      .returning();

    try {
      // Build thermal network
      const network = buildThermalNetwork(
        nodes,
        modelConductors,
        loads,
        (model.orbitalConfig as OrbitalConfig) ?? null,
      );

      // Configure solver
      const simConfig: SimulationConfig = {
        simulationType: parsed.data.simulationType,
        timeStart: parsed.data.config.timeStart,
        timeEnd: parsed.data.config.timeEnd,
        timeStep: parsed.data.config.timeStep,
        maxIterations: parsed.data.config.maxIterations,
        tolerance: parsed.data.config.tolerance,
        minStep: parsed.data.config.minStep ?? parsed.data.config.timeStep * 0.001,
        maxStep: parsed.data.config.maxStep ?? parsed.data.config.timeStep * 10,
      };

      // Run simulation with timeout
      const startTime = Date.now();
      const result = runSimulation(network, simConfig);
      const elapsed = Date.now() - startTime;

      if (elapsed > MAX_SIMULATION_TIME_MS) {
        // Mark as failed if it took too long (shouldn't happen in sync but safeguard)
        await db
          .update(simulationRuns)
          .set({
            status: 'failed',
            completedAt: new Date(),
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

      // Store results
      for (const nodeResult of result.nodeResults) {
        await db.insert(simulationResults).values({
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
        });
      }

      // Update run status
      await db
        .update(simulationRuns)
        .set({
          status: 'completed',
          completedAt: new Date(),
          energyBalanceError: energyBalance.relativeError,
        })
        .where(eq(simulationRuns.id, run.id));

      return NextResponse.json({
        run: {
          ...run,
          status: 'completed',
          completedAt: new Date(),
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
      // Mark run as failed
      const errorMessage =
        simError instanceof Error ? simError.message : 'Unknown simulation error';

      await db
        .update(simulationRuns)
        .set({
          status: 'failed',
          completedAt: new Date(),
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
