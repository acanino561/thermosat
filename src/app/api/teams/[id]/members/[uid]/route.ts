import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { teams, orgMembers, teamMembers } from '@/lib/db/schema';
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

const updateTeamRoleSchema = z.object({
  role: z.enum(['admin', 'editor', 'viewer']),
});

export async function PUT(
  request: Request,
  { params }: RouteParams,
): Promise<NextResponse> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const { id, uid } = await params;

    const [team] = await db.select().from(teams).where(eq(teams.id, id));
    if (!team) return notFoundResponse('Team');

    const [orgMember] = await db
      .select()
      .from(orgMembers)
      .where(and(eq(orgMembers.orgId, team.orgId), eq(orgMembers.userId, user.id)));
    if (!orgMember) return forbiddenResponse();

    const isOrgAdmin = orgMember.role === 'owner' || orgMember.role === 'admin';
    const [callerTm] = await db
      .select()
      .from(teamMembers)
      .where(and(eq(teamMembers.teamId, id), eq(teamMembers.userId, user.id)));
    const isTeamAdmin = callerTm?.role === 'admin';

    if (!isOrgAdmin && !isTeamAdmin) return forbiddenResponse();

    const body = await parseJsonBody(request);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = updateTeamRoleSchema.safeParse(body);
    if (!parsed.success) {
      return validationErrorResponse(parsed.error);
    }

    const [target] = await db
      .select()
      .from(teamMembers)
      .where(and(eq(teamMembers.teamId, id), eq(teamMembers.userId, uid)));
    if (!target) return notFoundResponse('Team member');

    const [updated] = await db
      .update(teamMembers)
      .set({ role: parsed.data.role })
      .where(eq(teamMembers.id, target.id))
      .returning();

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('PUT /api/teams/[id]/members/[uid] error:', error);
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

    const [team] = await db.select().from(teams).where(eq(teams.id, id));
    if (!team) return notFoundResponse('Team');

    const [orgMember] = await db
      .select()
      .from(orgMembers)
      .where(and(eq(orgMembers.orgId, team.orgId), eq(orgMembers.userId, user.id)));
    if (!orgMember) return forbiddenResponse();

    const isOrgAdmin = orgMember.role === 'owner' || orgMember.role === 'admin';
    const [callerTm] = await db
      .select()
      .from(teamMembers)
      .where(and(eq(teamMembers.teamId, id), eq(teamMembers.userId, user.id)));
    const isTeamAdmin = callerTm?.role === 'admin';
    const isSelfRemove = uid === user.id;

    if (!isOrgAdmin && !isTeamAdmin && !isSelfRemove) return forbiddenResponse();

    const [target] = await db
      .select()
      .from(teamMembers)
      .where(and(eq(teamMembers.teamId, id), eq(teamMembers.userId, uid)));
    if (!target) return notFoundResponse('Team member');

    await db.delete(teamMembers).where(eq(teamMembers.id, target.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/teams/[id]/members/[uid] error:', error);
    return serverErrorResponse();
  }
}
