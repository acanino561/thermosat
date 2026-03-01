import { db } from '@/lib/db/client';
import { projects, orgMembers, teamMembers, teamProjects } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export type ProjectRole = 'owner' | 'admin' | 'editor' | 'viewer';

const ROLE_HIERARCHY: Record<ProjectRole, number> = {
  owner: 4,
  admin: 3,
  editor: 2,
  viewer: 1,
};

/**
 * Check if a role meets or exceeds a minimum role.
 * Throws 403-style error if not.
 */
export function requireRole(role: ProjectRole, minimumRole: ProjectRole): void {
  if (ROLE_HIERARCHY[role] < ROLE_HIERARCHY[minimumRole]) {
    throw new AccessDeniedError(
      `Requires at least '${minimumRole}' role, but user has '${role}'`,
    );
  }
}

export class AccessDeniedError extends Error {
  public readonly statusCode = 403;
  constructor(message = 'Forbidden') {
    super(message);
    this.name = 'AccessDeniedError';
  }
}

/**
 * Determine a user's effective role on a project.
 * - Personal projects (orgId null): only the project creator gets 'owner'
 * - Org projects: check org_members + team_members roles
 *
 * Throws AccessDeniedError if user has no access.
 */
export async function getUserProjectAccess(
  userId: string,
  projectId: string,
): Promise<ProjectRole> {
  // Fetch the project
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId));

  if (!project) {
    throw new AccessDeniedError('Project not found');
  }

  // Personal project — only owner has access
  if (!project.orgId) {
    if (project.userId === userId) {
      return 'owner';
    }
    throw new AccessDeniedError('No access to this project');
  }

  // Org project — check org membership first
  const [orgMember] = await db
    .select()
    .from(orgMembers)
    .where(
      and(eq(orgMembers.orgId, project.orgId), eq(orgMembers.userId, userId)),
    );

  if (!orgMember) {
    throw new AccessDeniedError('No access to this project');
  }

  // Org owner → 'owner' on all org projects
  if (orgMember.role === 'owner') {
    return 'owner';
  }

  // Org admin → 'admin' on all org projects
  if (orgMember.role === 'admin') {
    return 'admin';
  }

  // Org member — check team assignments for this project
  // Find all teams that have this project assigned
  const projectTeams = await db
    .select({ teamId: teamProjects.teamId })
    .from(teamProjects)
    .where(eq(teamProjects.projectId, projectId));

  if (projectTeams.length === 0) {
    // Org member but project not assigned to any team — viewer on org projects
    return 'viewer';
  }

  // Check if user is in any of those teams and get best role
  let bestRole: ProjectRole | null = null;

  for (const { teamId } of projectTeams) {
    const [tm] = await db
      .select()
      .from(teamMembers)
      .where(
        and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)),
      );

    if (tm) {
      const mappedRole: ProjectRole =
        tm.role === 'admin' ? 'admin' : tm.role === 'editor' ? 'editor' : 'viewer';
      if (!bestRole || ROLE_HIERARCHY[mappedRole] > ROLE_HIERARCHY[bestRole]) {
        bestRole = mappedRole;
      }
    }
  }

  if (bestRole) {
    return bestRole;
  }

  // Org member but not in any team that has this project — no access
  throw new AccessDeniedError('No access to this project');
}
