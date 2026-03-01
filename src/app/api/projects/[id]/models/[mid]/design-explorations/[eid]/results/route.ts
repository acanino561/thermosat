import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { thermalModels, designExplorations, explorationResults } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import {
  getAuthenticatedUser,
  unauthorizedResponse,
  notFoundResponse,
  serverErrorResponse,
  forbiddenResponse,
} from '@/lib/utils/api-helpers';
import { getUserProjectAccess, requireRole, AccessDeniedError } from '@/lib/auth/access';

interface RouteParams {
  params: Promise<{ id: string; mid: string; eid: string }>;
}

export async function GET(
  request: Request,
  { params }: RouteParams,
): Promise<NextResponse> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const { id, mid, eid } = await params;

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

    const [exploration] = await db
      .select()
      .from(designExplorations)
      .where(and(eq(designExplorations.id, eid), eq(designExplorations.modelId, mid)));
    if (!exploration) return notFoundResponse('Exploration');

    const results = await db
      .select()
      .from(explorationResults)
      .where(eq(explorationResults.explorationId, eid));

    return NextResponse.json({
      data: {
        exploration: {
          id: exploration.id,
          modelId: exploration.modelId,
          config: exploration.config,
          status: exploration.status,
          numSamples: exploration.numSamples,
          completedSamples: exploration.completedSamples,
        },
        results: results.map((r) => ({
          sampleIndex: r.sampleIndex,
          paramValues: r.paramValues,
          nodeResults: r.nodeResults,
          feasible: r.feasible,
        })),
      },
    });
  } catch (error) {
    console.error('GET /api/.../design-explorations/[eid]/results error:', error);
    return serverErrorResponse();
  }
}
