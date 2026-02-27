import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { thermalModels, modelSnapshots } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import {
  getAuthenticatedUser,
  unauthorizedResponse,
  notFoundResponse,
  serverErrorResponse,
  verifyProjectOwnership,
} from '@/lib/utils/api-helpers';

interface RouteParams {
  params: Promise<{ id: string; mid: string; sid: string }>;
}

// GET - Fetch a single snapshot (with full data for restore)
export async function GET(
  _request: Request,
  { params }: RouteParams,
): Promise<NextResponse> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const { id, mid, sid } = await params;
    const project = await verifyProjectOwnership(id, user.id);
    if (!project) return notFoundResponse('Project');

    const [model] = await db
      .select()
      .from(thermalModels)
      .where(and(eq(thermalModels.id, mid), eq(thermalModels.projectId, id)));
    if (!model) return notFoundResponse('Model');

    const [snapshot] = await db
      .select()
      .from(modelSnapshots)
      .where(and(eq(modelSnapshots.id, sid), eq(modelSnapshots.modelId, mid)));
    if (!snapshot) return notFoundResponse('Snapshot');

    return NextResponse.json(snapshot);
  } catch (error) {
    console.error('GET snapshot error:', error);
    return serverErrorResponse();
  }
}
