import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { heatLoads } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { updateHeatLoadSchema } from '@/lib/validators/heat-loads';
import {
  getAuthenticatedUser,
  unauthorizedResponse,
  notFoundResponse,
  validationErrorResponse,
  serverErrorResponse,
  verifyProjectOwnership,
  verifyModelOwnership,
  parseJsonBody,
} from '@/lib/utils/api-helpers';

interface RouteParams {
  params: Promise<{ id: string; mid: string; hid: string }>;
}

export async function PUT(
  request: Request,
  { params }: RouteParams,
): Promise<NextResponse> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const { id, mid, hid } = await params;
    const project = await verifyProjectOwnership(id, user.id);
    if (!project) return notFoundResponse('Project');
    const model = await verifyModelOwnership(mid, id);
    if (!model) return notFoundResponse('Model');

    const body = await parseJsonBody(request);
    if (!body) {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 },
      );
    }

    const parsed = updateHeatLoadSchema.safeParse(body);
    if (!parsed.success) {
      return validationErrorResponse(parsed.error);
    }

    const [existing] = await db
      .select()
      .from(heatLoads)
      .where(and(eq(heatLoads.id, hid), eq(heatLoads.modelId, mid)));
    if (!existing) return notFoundResponse('Heat load');

    const [updated] = await db
      .update(heatLoads)
      .set(parsed.data)
      .where(eq(heatLoads.id, hid))
      .returning();

    return NextResponse.json({ heatLoad: updated });
  } catch (error) {
    console.error('PUT /api/.../heat-loads/[hid] error:', error);
    return serverErrorResponse();
  }
}

export async function DELETE(
  _request: Request,
  { params }: RouteParams,
): Promise<NextResponse> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const { id, mid, hid } = await params;
    const project = await verifyProjectOwnership(id, user.id);
    if (!project) return notFoundResponse('Project');
    const model = await verifyModelOwnership(mid, id);
    if (!model) return notFoundResponse('Model');

    const [existing] = await db
      .select()
      .from(heatLoads)
      .where(and(eq(heatLoads.id, hid), eq(heatLoads.modelId, mid)));
    if (!existing) return notFoundResponse('Heat load');

    await db.delete(heatLoads).where(eq(heatLoads.id, hid));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/.../heat-loads/[hid] error:', error);
    return serverErrorResponse();
  }
}
