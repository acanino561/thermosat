import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { projects } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { updateProjectSchema } from '@/lib/validators/projects';
import {
  getAuthenticatedUser,
  unauthorizedResponse,
  notFoundResponse,
  validationErrorResponse,
  serverErrorResponse,
  parseJsonBody,
  forbiddenResponse,
} from '@/lib/utils/api-helpers';
import { getUserProjectAccess, requireRole, AccessDeniedError } from '@/lib/auth/access';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(
  _request: Request,
  { params }: RouteParams,
): Promise<NextResponse> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const { id } = await params;

    try {
      await getUserProjectAccess(user.id, id);
    } catch (e) {
      if (e instanceof AccessDeniedError) return forbiddenResponse();
      throw e;
    }

    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, id));

    if (!project) return notFoundResponse('Project');

    return NextResponse.json({ project });
  } catch (error) {
    console.error('GET /api/projects/[id] error:', error);
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

    const body = await parseJsonBody(request);
    if (!body) {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 },
      );
    }

    const parsed = updateProjectSchema.safeParse(body);
    if (!parsed.success) {
      return validationErrorResponse(parsed.error);
    }

    const [existing] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, id));
    if (!existing) return notFoundResponse('Project');

    const [updated] = await db
      .update(projects)
      .set({
        ...parsed.data,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, id))
      .returning();

    try {
      const { logAuditEvent } = await import('@/lib/audit/logger');
      await logAuditEvent({
        userId: user.id,
        action: 'project.updated',
        entityType: 'project',
        entityId: id,
        projectId: id,
        orgId: updated.orgId ?? undefined,
        before: existing,
        after: updated,
        ipAddress: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'unknown',
        userAgent: request.headers.get('user-agent') ?? undefined,
      });
    } catch { /* audit best-effort */ }

    return NextResponse.json({ project: updated });
  } catch (error) {
    console.error('PUT /api/projects/[id] error:', error);
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

    let role;
    try {
      role = await getUserProjectAccess(user.id, id);
    } catch (e) {
      if (e instanceof AccessDeniedError) return forbiddenResponse();
      throw e;
    }

    try {
      requireRole(role, 'owner');
    } catch {
      return forbiddenResponse();
    }

    const [existing] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, id));
    if (!existing) return notFoundResponse('Project');

    await db.delete(projects).where(eq(projects.id, id));

    try {
      const { logAuditEvent } = await import('@/lib/audit/logger');
      await logAuditEvent({
        userId: user.id,
        action: 'project.deleted',
        entityType: 'project',
        entityId: id,
        projectId: id,
        orgId: existing.orgId ?? undefined,
        before: existing,
        ipAddress: _request.headers.get('x-forwarded-for') ?? _request.headers.get('x-real-ip') ?? 'unknown',
        userAgent: _request.headers.get('user-agent') ?? undefined,
      });
    } catch { /* audit best-effort */ }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/projects/[id] error:', error);
    return serverErrorResponse();
  }
}
