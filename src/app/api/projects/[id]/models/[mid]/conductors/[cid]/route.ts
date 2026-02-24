import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { conductors } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { updateConductorSchema } from '@/lib/validators/conductors';
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
  params: Promise<{ id: string; mid: string; cid: string }>;
}

export async function PUT(
  request: Request,
  { params }: RouteParams,
): Promise<NextResponse> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const { id, mid, cid } = await params;
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

    const parsed = updateConductorSchema.safeParse(body);
    if (!parsed.success) {
      return validationErrorResponse(parsed.error);
    }

    const [existing] = await db
      .select()
      .from(conductors)
      .where(and(eq(conductors.id, cid), eq(conductors.modelId, mid)));
    if (!existing) return notFoundResponse('Conductor');

    const [updated] = await db
      .update(conductors)
      .set(parsed.data)
      .where(eq(conductors.id, cid))
      .returning();

    return NextResponse.json({ conductor: updated });
  } catch (error) {
    console.error('PUT /api/.../conductors/[cid] error:', error);
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

    const { id, mid, cid } = await params;
    const project = await verifyProjectOwnership(id, user.id);
    if (!project) return notFoundResponse('Project');
    const model = await verifyModelOwnership(mid, id);
    if (!model) return notFoundResponse('Model');

    const [existing] = await db
      .select()
      .from(conductors)
      .where(and(eq(conductors.id, cid), eq(conductors.modelId, mid)));
    if (!existing) return notFoundResponse('Conductor');

    await db.delete(conductors).where(eq(conductors.id, cid));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/.../conductors/[cid] error:', error);
    return serverErrorResponse();
  }
}
