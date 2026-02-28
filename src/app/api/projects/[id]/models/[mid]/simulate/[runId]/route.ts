import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { simulationRuns, thermalModels } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import {
  getAuthenticatedUser,
  unauthorizedResponse,
  notFoundResponse,
  serverErrorResponse,
  verifyProjectOwnership,
} from '@/lib/utils/api-helpers';

interface RouteParams {
  params: Promise<{ id: string; mid: string; runId: string }>;
}

export async function GET(
  request: Request,
  { params }: RouteParams,
): Promise<NextResponse> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const { id, mid, runId } = await params;
    const project = await verifyProjectOwnership(id, user.id);
    if (!project) return notFoundResponse('Project');

    const [model] = await db
      .select()
      .from(thermalModels)
      .where(and(eq(thermalModels.id, mid), eq(thermalModels.projectId, id)));
    if (!model) return notFoundResponse('Model');

    const [run] = await db
      .select()
      .from(simulationRuns)
      .where(and(eq(simulationRuns.id, runId), eq(simulationRuns.modelId, mid)));
    if (!run) return notFoundResponse('Simulation run');

    return NextResponse.json(run);
  } catch (error) {
    console.error('GET /api/.../simulate/[runId] error:', error);
    return serverErrorResponse();
  }
}
