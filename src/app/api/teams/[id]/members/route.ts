import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { teams, orgMembers, teamMembers, users } from '@/lib/db/schema';
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

const addMemberSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['admin', 'editor', 'viewer']).default('viewer'),
});

export async function GET(
  _request: Request,
  { params }: RouteParams,
): Promise<NextResponse> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const { id } = await params;

    const [team] = await db.select().from(teams).where(eq(teams.id, id));
    if (!team) return notFoundResponse('Team');

    // Must be org member to view
    const [orgMember] = await db
      .select()
      .from(orgMembers)
      .where(and(eq(orgMembers.orgId, team.orgId), eq(orgMembers.userId, user.id)));
    if (!orgMember) return forbiddenResponse();

    const members = await db
      .select({
        id: teamMembers.id,
        userId: teamMembers.userId,
        role: teamMembers.role,
        createdAt: teamMembers.createdAt,
        userName: users.name,
        userEmail: users.email,
        userImage: users.image,
      })
      .from(teamMembers)
      .innerJoin(users, eq(teamMembers.userId, users.id))
      .where(eq(teamMembers.teamId, id));

    return NextResponse.json({ data: members });
  } catch (error) {
    console.error('GET /api/teams/[id]/members error:', error);
    return serverErrorResponse();
  }
}

export async function POST(
  request: Request,
  { params }: RouteParams,
): Promise<NextResponse> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const { id } = await params;

    const [team] = await db.select().from(teams).where(eq(teams.id, id));
    if (!team) return notFoundResponse('Team');

    // Caller must be org admin+ or team admin
    const [orgMember] = await db
      .select()
      .from(orgMembers)
      .where(and(eq(orgMembers.orgId, team.orgId), eq(orgMembers.userId, user.id)));
    if (!orgMember) return forbiddenResponse();

    const isOrgAdmin = orgMember.role === 'owner' || orgMember.role === 'admin';
    const [callerTeamMember] = await db
      .select()
      .from(teamMembers)
      .where(and(eq(teamMembers.teamId, id), eq(teamMembers.userId, user.id)));
    const isTeamAdmin = callerTeamMember?.role === 'admin';

    if (!isOrgAdmin && !isTeamAdmin) return forbiddenResponse();

    const body = await parseJsonBody(request);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = addMemberSchema.safeParse(body);
    if (!parsed.success) {
      return validationErrorResponse(parsed.error);
    }

    // Target must be org member
    const [targetOrgMember] = await db
      .select()
      .from(orgMembers)
      .where(
        and(eq(orgMembers.orgId, team.orgId), eq(orgMembers.userId, parsed.data.userId)),
      );
    if (!targetOrgMember) {
      return NextResponse.json(
        { error: 'User must be an organization member first' },
        { status: 400 },
      );
    }

    // Check if already a team member
    const [existing] = await db
      .select()
      .from(teamMembers)
      .where(
        and(eq(teamMembers.teamId, id), eq(teamMembers.userId, parsed.data.userId)),
      );
    if (existing) {
      return NextResponse.json(
        { error: 'User is already a member of this team' },
        { status: 409 },
      );
    }

    const [member] = await db
      .insert(teamMembers)
      .values({
        teamId: id,
        userId: parsed.data.userId,
        role: parsed.data.role,
      })
      .returning();

    return NextResponse.json({ data: member }, { status: 201 });
  } catch (error) {
    console.error('POST /api/teams/[id]/members error:', error);
    return serverErrorResponse();
  }
}
