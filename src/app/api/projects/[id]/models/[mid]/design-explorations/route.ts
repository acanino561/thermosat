import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import {
  thermalModels,
  thermalNodes,
  conductors,
  heatLoads,
  designExplorations,
  explorationResults,
} from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import {
  getAuthenticatedUser,
  unauthorizedResponse,
  notFoundResponse,
  serverErrorResponse,
  forbiddenResponse,
} from '@/lib/utils/api-helpers';
import { getUserProjectAccess, requireRole, AccessDeniedError } from '@/lib/auth/access';
import { buildThermalNetwork, runSimulation } from '@/lib/solver/thermal-network';
import {
  latinHypercubeSample,
  randomSample,
  applyParameterSample,
  checkFeasibility,
  extractNodeResults,
} from '@/lib/solver/design-space';
import type { ExplorationConfig } from '@/lib/solver/design-space';
import type { SimulationConfig } from '@/lib/solver/types';

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

    // Verify model belongs to project
    const [model] = await db
      .select()
      .from(thermalModels)
      .where(and(eq(thermalModels.id, mid), eq(thermalModels.projectId, id)));
    if (!model) return notFoundResponse('Model');

    // Parse request body
    let body: ExplorationConfig;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    // Validate
    if (!body || !Array.isArray(body.parameters) || body.parameters.length === 0) {
      return NextResponse.json(
        { error: 'Request must include a non-empty "parameters" array' },
        { status: 400 },
      );
    }
    if (body.parameters.length > 5) {
      return NextResponse.json(
        { error: 'Maximum 5 parameters allowed' },
        { status: 400 },
      );
    }
    if (!body.numSamples || body.numSamples < 10 || body.numSamples > 100) {
      return NextResponse.json(
        { error: 'numSamples must be between 10 and 100' },
        { status: 400 },
      );
    }

    // Fetch model data
    const nodes = await db
      .select()
      .from(thermalNodes)
      .where(eq(thermalNodes.modelId, mid));

    if (nodes.length === 0) {
      return NextResponse.json(
        { error: 'Model has no nodes. Add at least one node before running exploration.' },
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

    // Create exploration row
    const [exploration] = await db
      .insert(designExplorations)
      .values({
        modelId: mid,
        config: body as unknown as Record<string, unknown>,
        status: 'running',
        numSamples: body.numSamples,
      })
      .returning();

    // Generate samples
    const samplingMethod = body.samplingMethod ?? 'lhs';
    const samples =
      samplingMethod === 'lhs'
        ? latinHypercubeSample(body.parameters, body.numSamples)
        : randomSample(body.parameters, body.numSamples);

    // Build node name map
    const nodeNameMap = new Map<string, string>();
    for (const n of nodes) {
      nodeNameMap.set(n.id, n.name);
    }

    // Default steady-state config for exploration
    const simConfig: SimulationConfig = {
      simulationType: 'steady_state',
      timeStart: 0,
      timeEnd: 1000,
      timeStep: 1,
      maxIterations: 500,
      tolerance: 0.01,
      minStep: 0.1,
      maxStep: 10,
    };

    const constraints = body.constraints ?? [];
    let completedCount = 0;

    // Run samples sequentially
    for (let i = 0; i < samples.length; i++) {
      try {
        const sample = samples[i];
        const modified = applyParameterSample(
          nodes,
          modelConductors,
          loads,
          body.parameters,
          sample,
        );

        const network = buildThermalNetwork(
          modified.nodes,
          modified.conductors,
          modified.heatLoads,
          model.orbitalConfig as import('@/lib/solver/types').OrbitalConfig | null,
        );

        const result = runSimulation(network, simConfig);

        const nodeResults = extractNodeResults(
          result.nodeResults,
          nodeNameMap,
        );

        const feasible = checkFeasibility(nodeResults, constraints);

        await db.insert(explorationResults).values({
          explorationId: exploration.id,
          sampleIndex: i,
          paramValues: sample as unknown as Record<string, unknown>,
          nodeResults: nodeResults as unknown as Record<string, unknown>[],
          feasible,
        });

        completedCount++;

        // Update progress
        await db
          .update(designExplorations)
          .set({ completedSamples: completedCount })
          .where(eq(designExplorations.id, exploration.id));
      } catch (sampleError) {
        console.error(`Exploration sample ${i} error:`, sampleError);
        // Store as infeasible with empty results
        await db.insert(explorationResults).values({
          explorationId: exploration.id,
          sampleIndex: i,
          paramValues: samples[i] as unknown as Record<string, unknown>,
          nodeResults: [] as unknown as Record<string, unknown>[],
          feasible: false,
        });
        completedCount++;
      }
    }

    // Mark completed
    await db
      .update(designExplorations)
      .set({
        status: 'completed',
        completedSamples: completedCount,
        completedAt: new Date(),
      })
      .where(eq(designExplorations.id, exploration.id));

    // Fetch results
    const results = await db
      .select()
      .from(explorationResults)
      .where(eq(explorationResults.explorationId, exploration.id));

    return NextResponse.json({
      explorationId: exploration.id,
      status: 'completed',
      numSamples: body.numSamples,
      completedSamples: completedCount,
      results: results.map((r) => ({
        id: r.id,
        sampleIndex: r.sampleIndex,
        paramValues: r.paramValues,
        nodeResults: r.nodeResults,
        feasible: r.feasible,
      })),
    });
  } catch (error) {
    console.error('POST /api/.../design-explorations error:', error);
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

    const explorations = await db
      .select()
      .from(designExplorations)
      .where(eq(designExplorations.modelId, mid));

    return NextResponse.json({ explorations });
  } catch (error) {
    console.error('GET /api/.../design-explorations error:', error);
    return serverErrorResponse();
  }
}
