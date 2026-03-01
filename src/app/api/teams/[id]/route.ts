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
  params: Promise<{ id: string }>;
}

const updateTeamSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
});

async function getTeamWithAuth(teamId: string, userId: string) {
  const [team] = await db.select().from(teams).where(eq(teams.id, teamId));
  if (!team) return { team: null, orgMember: null, teamMember: null };

  const [orgMember] = await db
    .select()
    .from(orgMembers)
    .where(and(eq(orgMembers.orgId, team.orgId), eq(orgMembers.userId, userId)));

  const [teamMember] = await db
    .select()
    .from(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)));

  return { team, orgMember: orgMember ?? null, teamMember: teamMember ?? null };
}

export async function GET(
  _request: Request,
  { params }: RouteParams,
): Promise<NextResponse> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const { id } = await params;
    const { team, orgMember } = await getTeamWithAuth(id, user.id);
    if (!team) return notFoundResponse('Team');
    if (!orgMember) return forbiddenResponse();

    return NextResponse.json({ data: team });
  } catch (error) {
    console.error('GET /api/teams/[id] error:', error);
    return serverErrorResponse();
  }
}

export async function PUT(
  request: Request,
  { params }: RouteParams,
): Promise<NextResponse> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const { id } = await params;
    const { team, orgMember, teamMember } = await getTeamWithAuth(id, user.id);
    if (!team) return notFoundResponse('Team');
    if (!orgMember) return forbiddenResponse();

    // Team admin+ or org admin+
    const isOrgAdmin = orgMember.role === 'owner' || orgMember.role === 'admin';
    const isTeamAdmin = teamMember?.role === 'admin';
    if (!isOrgAdmin && !isTeamAdmin) return forbiddenResponse();

    const body = await parseJsonBody(request);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = updateTeamSchema.safeParse(body);
    if (!parsed.success) {
      return validationErrorResponse(parsed.error);
    }

    const updateData: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
    if (parsed.data.description !== undefined) updateData.description = parsed.data.description;

    const [updated] = await db
      .update(teams)
      .set(updateData)
      .where(eq(teams.id, id))
      .returning();

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('PUT /api/teams/[id] error:', error);
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

    const { id } = await params;
    const { team, orgMember } = await getTeamWithAuth(id, user.id);
    if (!team) return notFoundResponse('Team');
    if (!orgMember) return forbiddenResponse();

    // Only org admin+ can delete teams
    if (orgMember.role !== 'owner' && orgMember.role !== 'admin') {
      return forbiddenResponse();
    }

    await db.delete(teams).where(eq(teams.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/teams/[id] error:', error);
    return serverErrorResponse();
  }
}
