import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { teams, orgMembers, teamMembers, teamProjects, projects } from '@/lib/db/schema';
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

const assignProjectSchema = z.object({
  projectId: z.string().uuid(),
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

    const [orgMember] = await db
      .select()
      .from(orgMembers)
      .where(and(eq(orgMembers.orgId, team.orgId), eq(orgMembers.userId, user.id)));
    if (!orgMember) return forbiddenResponse();

    const teamProjectsList = await db
      .select({
        id: teamProjects.id,
        teamId: teamProjects.teamId,
        projectId: teamProjects.projectId,
        createdAt: teamProjects.createdAt,
        projectName: projects.name,
        projectDescription: projects.description,
      })
      .from(teamProjects)
      .innerJoin(projects, eq(teamProjects.projectId, projects.id))
      .where(eq(teamProjects.teamId, id));

    return NextResponse.json({ data: teamProjectsList });
  } catch (error) {
    console.error('GET /api/teams/[id]/projects error:', error);
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

    const parsed = assignProjectSchema.safeParse(body);
    if (!parsed.success) {
      return validationErrorResponse(parsed.error);
    }

    // Verify project belongs to the same org
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, parsed.data.projectId));
    if (!project) return notFoundResponse('Project');
    if (project.orgId !== team.orgId) {
      return NextResponse.json(
        { error: 'Project must belong to the same organization' },
        { status: 400 },
      );
    }

    // Check not already assigned
    const [existing] = await db
      .select()
      .from(teamProjects)
      .where(
        and(
          eq(teamProjects.teamId, id),
          eq(teamProjects.projectId, parsed.data.projectId),
        ),
      );
    if (existing) {
      return NextResponse.json(
        { error: 'Project is already assigned to this team' },
        { status: 409 },
      );
    }

    const [tp] = await db
      .insert(teamProjects)
      .values({
        teamId: id,
        projectId: parsed.data.projectId,
      })
      .returning();

    return NextResponse.json({ data: tp }, { status: 201 });
  } catch (error) {
    console.error('POST /api/teams/[id]/projects error:', error);
    return serverErrorResponse();
  }
}

export async function DELETE(
  request: Request,
  { params }: RouteParams,
): Promise<NextResponse> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const { id } = await params;

    // Get projectId from query string
    const url = new URL(request.url);
    const projectId = url.searchParams.get('projectId');
    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId query parameter is required' },
        { status: 400 },
      );
    }

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

    const [existing] = await db
      .select()
      .from(teamProjects)
      .where(
        and(eq(teamProjects.teamId, id), eq(teamProjects.projectId, projectId)),
      );
    if (!existing) return notFoundResponse('Team project assignment');

    await db.delete(teamProjects).where(eq(teamProjects.id, existing.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/teams/[id]/projects error:', error);
    return serverErrorResponse();
  }
}
