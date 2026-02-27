import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { thermalModels, modelSnapshots } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import {
  getAuthenticatedUser,
  unauthorizedResponse,
  notFoundResponse,
  serverErrorResponse,
  verifyProjectOwnership,
  parseJsonBody,
} from '@/lib/utils/api-helpers';

interface RouteParams {
  params: Promise<{ id: string; mid: string }>;
}

// GET - List snapshots for a model
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

    const [model] = await db
      .select()
      .from(thermalModels)
      .where(and(eq(thermalModels.id, mid), eq(thermalModels.projectId, id)));
    if (!model) return notFoundResponse('Model');

    const snapshots = await db
      .select({
        id: modelSnapshots.id,
        version: modelSnapshots.version,
        description: modelSnapshots.description,
        createdAt: modelSnapshots.createdAt,
      })
      .from(modelSnapshots)
      .where(eq(modelSnapshots.modelId, mid))
      .orderBy(desc(modelSnapshots.createdAt))
      .limit(100);

    return NextResponse.json(snapshots);
  } catch (error) {
    console.error('GET snapshots error:', error);
    return serverErrorResponse();
  }
}

// POST - Create a snapshot manually
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

    const [model] = await db
      .select()
      .from(thermalModels)
      .where(and(eq(thermalModels.id, mid), eq(thermalModels.projectId, id)));
    if (!model) return notFoundResponse('Model');

    const body = await parseJsonBody<Record<string, unknown>>(request);
    if (!body || !body.snapshot) {
      return NextResponse.json({ error: 'Missing snapshot data' }, { status: 400 });
    }

    const [snapshot] = await db
      .insert(modelSnapshots)
      .values({
        modelId: mid,
        version: model.version,
        description: (body.description as string) || 'Manual snapshot',
        snapshot: body.snapshot as import('@/lib/db/schema').ModelSnapshotData,
      })
      .returning();

    return NextResponse.json(snapshot);
  } catch (error) {
    console.error('POST snapshot error:', error);
    return serverErrorResponse();
  }
}
