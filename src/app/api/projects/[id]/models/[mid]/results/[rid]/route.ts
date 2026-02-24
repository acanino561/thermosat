import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { simulationRuns, simulationResults } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import {
  getAuthenticatedUser,
  unauthorizedResponse,
  notFoundResponse,
  serverErrorResponse,
  verifyProjectOwnership,
  verifyModelOwnership,
} from '@/lib/utils/api-helpers';

interface RouteParams {
  params: Promise<{ id: string; mid: string; rid: string }>;
}

export async function GET(
  _request: Request,
  { params }: RouteParams,
): Promise<NextResponse> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const { id, mid, rid } = await params;
    const project = await verifyProjectOwnership(id, user.id);
    if (!project) return notFoundResponse('Project');
    const model = await verifyModelOwnership(mid, id);
    if (!model) return notFoundResponse('Model');

    const [run] = await db
      .select()
      .from(simulationRuns)
      .where(
        and(
          eq(simulationRuns.id, rid),
          eq(simulationRuns.modelId, mid),
        ),
      );
    if (!run) return notFoundResponse('Simulation run');

    const results = await db
      .select()
      .from(simulationResults)
      .where(eq(simulationResults.runId, rid));

    return NextResponse.json({ run, results });
  } catch (error) {
    console.error('GET /api/.../results/[rid] error:', error);
    return serverErrorResponse();
  }
}
