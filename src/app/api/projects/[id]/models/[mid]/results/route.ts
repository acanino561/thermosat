import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { simulationRuns } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import {
  getAuthenticatedUser,
  unauthorizedResponse,
  notFoundResponse,
  serverErrorResponse,
  verifyProjectOwnership,
  verifyModelOwnership,
} from '@/lib/utils/api-helpers';

interface RouteParams {
  params: Promise<{ id: string; mid: string }>;
}

export async function GET(
  _request: Request,
  { params }: RouteParams,
): Promise<NextResponse> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const { id, mid } = await params;
    const project = await verifyProjectOwnership(id, user.id);
    if (!project) return notFoundResponse('Project');
    const model = await verifyModelOwnership(mid, id);
    if (!model) return notFoundResponse('Model');

    const runs = await db
      .select()
      .from(simulationRuns)
      .where(eq(simulationRuns.modelId, mid))
      .orderBy(desc(simulationRuns.createdAt));

    return NextResponse.json({ runs });
  } catch (error) {
    console.error('GET /api/.../results error:', error);
    return serverErrorResponse();
  }
}
