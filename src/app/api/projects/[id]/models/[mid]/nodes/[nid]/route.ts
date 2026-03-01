import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { thermalNodes } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { updateNodeSchema } from '@/lib/validators/nodes';
import {
  getAuthenticatedUser,
  unauthorizedResponse,
  notFoundResponse,
  validationErrorResponse,
  serverErrorResponse,
  verifyModelOwnership,
  parseJsonBody,
  forbiddenResponse,
} from '@/lib/utils/api-helpers';
import { getUserProjectAccess, requireRole, AccessDeniedError } from '@/lib/auth/access';

interface RouteParams {
  params: Promise<{ id: string; mid: string; nid: string }>;
}

export async function PUT(
  request: Request,
  { params }: RouteParams,
): Promise<NextResponse> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const { id, mid, nid } = await params;

    let role;
    try {
      role = await getUserProjectAccess(user.id, id);
    } catch (e) {
      if (e instanceof AccessDeniedError) return forbiddenResponse();
      throw e;
    }

    try {
      requireRole(role, 'editor');
    } catch {
      return forbiddenResponse();
    }

    const model = await verifyModelOwnership(mid, id);
    if (!model) return notFoundResponse('Model');

    const body = await parseJsonBody(request);
    if (!body) {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 },
      );
    }

    const parsed = updateNodeSchema.safeParse(body);
    if (!parsed.success) {
      return validationErrorResponse(parsed.error);
    }

    const [existing] = await db
      .select()
      .from(thermalNodes)
      .where(
        and(eq(thermalNodes.id, nid), eq(thermalNodes.modelId, mid)),
      );
    if (!existing) return notFoundResponse('Node');

    const [updated] = await db
      .update(thermalNodes)
      .set(parsed.data)
      .where(eq(thermalNodes.id, nid))
      .returning();

    return NextResponse.json({ node: updated });
  } catch (error) {
    console.error('PUT /api/.../nodes/[nid] error:', error);
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

    const { id, mid, nid } = await params;

    let role;
    try {
      role = await getUserProjectAccess(user.id, id);
    } catch (e) {
      if (e instanceof AccessDeniedError) return forbiddenResponse();
      throw e;
    }

    try {
      requireRole(role, 'editor');
    } catch {
      return forbiddenResponse();
    }

    const model = await verifyModelOwnership(mid, id);
    if (!model) return notFoundResponse('Model');

    const [existing] = await db
      .select()
      .from(thermalNodes)
      .where(
        and(eq(thermalNodes.id, nid), eq(thermalNodes.modelId, mid)),
      );
    if (!existing) return notFoundResponse('Node');

    await db.delete(thermalNodes).where(eq(thermalNodes.id, nid));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/.../nodes/[nid] error:', error);
    return serverErrorResponse();
  }
}
