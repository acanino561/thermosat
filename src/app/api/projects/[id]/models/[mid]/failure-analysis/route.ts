import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import {
  thermalModels,
  thermalNodes,
  conductors,
  heatLoads,
  simulationRuns,
  simulationResults,
  failureAnalyses,
  failureCases,
} from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import {
  getAuthenticatedUser,
  unauthorizedResponse,
  notFoundResponse,
  serverErrorResponse,
  forbiddenResponse,
  parseJsonBody,
} from '@/lib/utils/api-helpers';
import { getUserProjectAccess, requireRole, AccessDeniedError } from '@/lib/auth/access';
import { buildThermalNetwork, runSimulation } from '@/lib/solver/thermal-network';
import { applyFailureMode } from '@/lib/solver/failure-mode';
import type { FailureType, FailureModeParams } from '@/lib/solver/failure-mode';
import type { OrbitalConfig, SimulationConfig } from '@/lib/solver/types';

interface RouteParams {
  params: Promise<{ id: string; mid: string }>;
}

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
      .where(and(eq(thermalModels.id, mid), eq(thermalModels.projectId, id)));
    if (!model) return notFoundResponse('Model');

    // Parse request body
    interface FailureAnalysisBody {
      cases?: Array<{ failureType: FailureType; params?: FailureModeParams; label?: string }>;
    }
    const body = await parseJsonBody<FailureAnalysisBody>(request);
    if (!body || !Array.isArray(body.cases) || body.cases.length === 0) {
      return NextResponse.json(
        { error: 'Request must include a non-empty "cases" array' },
        { status: 400 },
      );
    }

    const validFailureTypes: FailureType[] = [
      'heater_failure',
      'mli_degradation',
      'coating_degradation_eol',
      'attitude_loss_tumble',
      'power_budget_reduction',
      'conductor_failure',
      'component_power_spike',
    ];

    for (const c of body.cases) {
      if (!validFailureTypes.includes(c.failureType)) {
        return NextResponse.json(
          { error: `Invalid failureType: ${c.failureType}` },
          { status: 400 },
        );
      }
    }

    // Fetch model data
    const nodes = await db
      .select()
      .from(thermalNodes)
      .where(eq(thermalNodes.modelId, mid));

    if (nodes.length === 0) {
      return NextResponse.json(
        { error: 'Model has no nodes. Add at least one node before running failure analysis.' },
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

    // Create analysis row
    const [analysis] = await db
      .insert(failureAnalyses)
      .values({
        modelId: mid,
        status: 'running',
      })
      .returning();

    // Create case rows
    const caseRows = await db
      .insert(failureCases)
      .values(
        body.cases.map((c: { failureType: FailureType; params?: FailureModeParams; label?: string }) => ({
          analysisId: analysis.id,
          failureType: c.failureType,
          label: c.label ?? null,
          params: c.params ?? {},
          status: 'pending' as const,
        })),
      )
      .returning();

    // Default simulation config for failure analysis runs
    const simConfig: SimulationConfig = {
      simulationType: 'transient',
      solverMethod: 'rk4',
      timeStart: 0,
      timeEnd: 5400, // 90 minutes (one orbit)
      timeStep: 10,
      maxIterations: 10000,
      tolerance: 0.01,
      minStep: 0.01,
      maxStep: 100,
    };

    const orbitalConfig = (model.orbitalConfig as OrbitalConfig) ?? null;

    // Process each case sequentially
    for (const caseRow of caseRows) {
      try {
        // Set case status to running
        await db
          .update(failureCases)
          .set({ status: 'running' })
          .where(eq(failureCases.id, caseRow.id));

        // Build network from original data
        const network = buildThermalNetwork(nodes, modelConductors, loads, orbitalConfig);

        // Apply failure mode to get modified solver-level data
        const modified = applyFailureMode(
          caseRow.failureType as FailureType,
          Array.from(network.nodes.values()),
          network.conductors,
          network.heatLoads,
          (caseRow.params as FailureModeParams) ?? {},
        );

        // Rebuild network from modified data (need to re-establish adjacency lists etc.)
        // We convert solver nodes back to DB-like format for buildThermalNetwork
        const modifiedNetwork = buildThermalNetwork(
          modified.nodes.map((n) => ({
            id: n.id,
            name: n.name,
            nodeType: n.nodeType,
            temperature: n.initialTemperature,
            capacitance: n.capacitance,
            boundaryTemp: n.boundaryTemp,
            area: n.area,
            absorptivity: n.absorptivity,
            emissivity: n.emissivity,
          })),
          modified.conductors.map((c) => ({
            id: c.id,
            name: c.name,
            conductorType: c.conductorType,
            nodeFromId: c.nodeFromId,
            nodeToId: c.nodeToId,
            conductance: c.conductance,
            area: c.area,
            viewFactor: c.viewFactor,
            emissivity: c.emissivity,
            conductanceData: c.conductanceData ?? undefined,
          })),
          modified.heatLoads.map((hl) => ({
            id: hl.id,
            name: hl.name,
            nodeId: hl.nodeId,
            loadType: hl.loadType,
            value: hl.value,
            timeValues: hl.timeValues.length > 0 ? hl.timeValues : null,
            orbitalParams: hl.orbitalParams,
          })),
          orbitalConfig,
        );

        // Run simulation
        const result = runSimulation(modifiedNetwork, simConfig);

        // Create simulation run record
        const [run] = await db
          .insert(simulationRuns)
          .values({
            modelId: mid,
            status: 'completed',
            simulationType: 'transient',
            config: {
              timeStart: simConfig.timeStart,
              timeEnd: simConfig.timeEnd,
              timeStep: simConfig.timeStep,
              maxIterations: simConfig.maxIterations,
              tolerance: simConfig.tolerance,
            },
            progress: 100,
            startedAt: new Date(),
            completedAt: new Date(),
          })
          .returning();

        // Store results
        const resultValues = result.nodeResults.map((nodeResult) => ({
          runId: run.id,
          nodeId: nodeResult.nodeId,
          timeValues: {
            times: nodeResult.times,
            temperatures: nodeResult.temperatures,
          },
          conductorFlows: result.conductorFlows
            .filter((cf) => {
              const conductor = modifiedNetwork.conductors.find(
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

        if (resultValues.length > 0) {
          await db.insert(simulationResults).values(resultValues);
        }

        // Update case with run ID and completed status
        await db
          .update(failureCases)
          .set({ runId: run.id, status: 'completed' })
          .where(eq(failureCases.id, caseRow.id));
      } catch (caseError) {
        console.error(`Failure case ${caseRow.id} error:`, caseError);
        await db
          .update(failureCases)
          .set({ status: 'failed' })
          .where(eq(failureCases.id, caseRow.id));
      }
    }

    // Mark analysis as completed
    await db
      .update(failureAnalyses)
      .set({ status: 'completed', completedAt: new Date() })
      .where(eq(failureAnalyses.id, analysis.id));

    // Fetch final state
    const finalCases = await db
      .select()
      .from(failureCases)
      .where(eq(failureCases.analysisId, analysis.id));

    return NextResponse.json({
      analysisId: analysis.id,
      status: 'completed',
      cases: finalCases.map((c) => ({
        id: c.id,
        failureType: c.failureType,
        label: c.label,
        status: c.status,
        runId: c.runId,
      })),
    });
  } catch (error) {
    console.error('POST /api/.../failure-analysis error:', error);
    return serverErrorResponse();
  }
}

export async function GET(
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
      requireRole(role, 'viewer');
    } catch {
      return forbiddenResponse();
    }

    // Verify model belongs to project
    const [model] = await db
      .select()
      .from(thermalModels)
      .where(and(eq(thermalModels.id, mid), eq(thermalModels.projectId, id)));
    if (!model) return notFoundResponse('Model');

    // Get all analyses for this model
    const analyses = await db
      .select()
      .from(failureAnalyses)
      .where(eq(failureAnalyses.modelId, mid));

    return NextResponse.json({ analyses });
  } catch (error) {
    console.error('GET /api/.../failure-analysis error:', error);
    return serverErrorResponse();
  }
}
