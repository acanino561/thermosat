import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { thermalModels, thermalNodes, conductors, heatLoads } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { authenticateApiKey, isErrorResponse } from '@/lib/utils/v1-helpers';
import { updateModelSchema } from '@/lib/validators/models';
import { parseJsonBody, validationErrorResponse } from '@/lib/utils/api-helpers';
import { getUserProjectAccess, requireRole, AccessDeniedError } from '@/lib/auth/access';

interface RouteParams {
  params: Promise<{ id: string }>;
}

async function getModelWithAccess(auth: { userId: string }, modelId: string) {
  const [model] = await db.select().from(thermalModels).where(eq(thermalModels.id, modelId));
  if (!model) return { model: null, role: null, error: 'Model not found' };

  try {
    const role = await getUserProjectAccess(auth.userId, model.projectId);
    return { model, role, error: null };
  } catch (e) {
    if (e instanceof AccessDeniedError) return { model: null, role: null, error: 'Forbidden' };
    throw e;
  }
}

export async function GET(request: Request, { params }: RouteParams): Promise<NextResponse> {
  try {
    const auth = await authenticateApiKey(request);
    if (isErrorResponse(auth)) return auth;

    const { id } = await params;
    const { model, error } = await getModelWithAccess(auth, id);
    if (!model) return NextResponse.json({ error: error ?? 'Not found' }, { status: error === 'Forbidden' ? 403 : 404 });

    const [nodes, modelConductors, loads] = await Promise.all([
      db.select().from(thermalNodes).where(eq(thermalNodes.modelId, id)),
      db.select().from(conductors).where(eq(conductors.modelId, id)),
      db.select().from(heatLoads).where(eq(heatLoads.modelId, id)),
    ]);

    return NextResponse.json({
      data: { ...model, nodes, conductors: modelConductors, heatLoads: loads },
    });
  } catch (error) {
    console.error('GET /api/v1/models/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: RouteParams): Promise<NextResponse> {
  try {
    const auth = await authenticateApiKey(request);
    if (isErrorResponse(auth)) return auth;

    const { id } = await params;
    const { model, role, error } = await getModelWithAccess(auth, id);
    if (!model || !role) return NextResponse.json({ error: error ?? 'Not found' }, { status: error === 'Forbidden' ? 403 : 404 });

    try { requireRole(role, 'editor'); } catch { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }); }

    const body = await parseJsonBody(request);
    if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });

    const parsed = updateModelSchema.safeParse(body);
    if (!parsed.success) return validationErrorResponse(parsed.error);

    const [updated] = await db
      .update(thermalModels)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(thermalModels.id, id))
      .returning();

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('PUT /api/v1/models/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams): Promise<NextResponse> {
  try {
    const auth = await authenticateApiKey(request);
    if (isErrorResponse(auth)) return auth;

    const { id } = await params;
    const { model, role, error } = await getModelWithAccess(auth, id);
    if (!model || !role) return NextResponse.json({ error: error ?? 'Not found' }, { status: error === 'Forbidden' ? 403 : 404 });

    try { requireRole(role, 'owner'); } catch { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }); }

    await db.delete(thermalModels).where(eq(thermalModels.id, id));

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error('DELETE /api/v1/models/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
