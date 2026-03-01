import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { orgMembers } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import {
  getAuthenticatedUser,
  unauthorizedResponse,
  notFoundResponse,
  validationErrorResponse,
  serverErrorResponse,
  forbiddenResponse,
  parseJsonBody,
} from '@/lib/utils/api-helpers';

interface RouteParams {
  params: Promise<{ id: string; uid: string }>;
}

const updateRoleSchema = z.object({
  role: z.enum(['owner', 'admin', 'member']),
});

export async function PUT(
  request: Request,
  { params }: RouteParams,
): Promise<NextResponse> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const { id, uid } = await params;

    // Verify caller is admin+
    const [caller] = await db
      .select()
      .from(orgMembers)
      .where(and(eq(orgMembers.orgId, id), eq(orgMembers.userId, user.id)));
    if (!caller) return forbiddenResponse();
    if (caller.role !== 'owner' && caller.role !== 'admin') {
      return forbiddenResponse();
    }

    const body = await parseJsonBody(request);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = updateRoleSchema.safeParse(body);
    if (!parsed.success) {
      return validationErrorResponse(parsed.error);
    }

    // Only owners can set owner role
    if (parsed.data.role === 'owner' && caller.role !== 'owner') {
      return forbiddenResponse();
    }

    const [target] = await db
      .select()
      .from(orgMembers)
      .where(and(eq(orgMembers.orgId, id), eq(orgMembers.userId, uid)));
    if (!target) return notFoundResponse('Member');

    // Cannot change own role (prevent owner from de-promoting themselves)
    if (uid === user.id) {
      return NextResponse.json(
        { error: 'Cannot change your own role' },
        { status: 400 },
      );
    }

    const [updated] = await db
      .update(orgMembers)
      .set({ role: parsed.data.role })
      .where(eq(orgMembers.id, target.id))
      .returning();

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('PUT /api/organizations/[id]/members/[uid] error:', error);
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

    const { id, uid } = await params;

    // Self-removal is allowed
    const isSelfRemove = uid === user.id;

    if (!isSelfRemove) {
      // Verify caller is admin+
      const [caller] = await db
        .select()
        .from(orgMembers)
        .where(and(eq(orgMembers.orgId, id), eq(orgMembers.userId, user.id)));
      if (!caller) return forbiddenResponse();
      if (caller.role !== 'owner' && caller.role !== 'admin') {
        return forbiddenResponse();
      }
    }

    const [target] = await db
      .select()
      .from(orgMembers)
      .where(and(eq(orgMembers.orgId, id), eq(orgMembers.userId, uid)));
    if (!target) return notFoundResponse('Member');

    // Cannot remove the last owner
    if (target.role === 'owner') {
      return NextResponse.json(
        { error: 'Cannot remove the organization owner' },
        { status: 400 },
      );
    }

    await db.delete(orgMembers).where(eq(orgMembers.id, target.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/organizations/[id]/members/[uid] error:', error);
    return serverErrorResponse();
  }
}
