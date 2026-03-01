import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { heatLoads, thermalModels } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { authenticateApiKey, isErrorResponse } from '@/lib/utils/v1-helpers';
import { updateHeatLoadSchema } from '@/lib/validators/heat-loads';
import { parseJsonBody, validationErrorResponse } from '@/lib/utils/api-helpers';
import { getUserProjectAccess, requireRole, AccessDeniedError } from '@/lib/auth/access';

interface RouteParams {
  params: Promise<{ id: string }>;
}

async function getHeatLoadWithAccess(auth: { userId: string }, heatLoadId: string) {
  const [load] = await db.select().from(heatLoads).where(eq(heatLoads.id, heatLoadId));
  if (!load) return { load: null, role: null };

  const [model] = await db.select().from(thermalModels).where(eq(thermalModels.id, load.modelId));
  if (!model) return { load: null, role: null };

  try {
    const role = await getUserProjectAccess(auth.userId, model.projectId);
    return { load, role };
  } catch (e) {
    if (e instanceof AccessDeniedError) return { load: null, role: null, forbidden: true };
    throw e;
  }
}

export async function PUT(request: Request, { params }: RouteParams): Promise<NextResponse> {
  try {
    const auth = await authenticateApiKey(request);
    if (isErrorResponse(auth)) return auth;

    const { id } = await params;
    const result = await getHeatLoadWithAccess(auth, id);
    if (!result.load) return NextResponse.json({ error: (result as any).forbidden ? 'Forbidden' : 'Heat load not found' }, { status: (result as any).forbidden ? 403 : 404 });

    try { requireRole(result.role!, 'editor'); } catch { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }); }

    const body = await parseJsonBody(request);
    if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });

    const parsed = updateHeatLoadSchema.safeParse(body);
    if (!parsed.success) return validationErrorResponse(parsed.error);

    const [updated] = await db.update(heatLoads).set(parsed.data).where(eq(heatLoads.id, id)).returning();

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('PUT /api/v1/heat-loads/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams): Promise<NextResponse> {
  try {
    const auth = await authenticateApiKey(request);
    if (isErrorResponse(auth)) return auth;

    const { id } = await params;
    const result = await getHeatLoadWithAccess(auth, id);
    if (!result.load) return NextResponse.json({ error: (result as any).forbidden ? 'Forbidden' : 'Heat load not found' }, { status: (result as any).forbidden ? 403 : 404 });

    try { requireRole(result.role!, 'editor'); } catch { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }); }

    await db.delete(heatLoads).where(eq(heatLoads.id, id));

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error('DELETE /api/v1/heat-loads/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
