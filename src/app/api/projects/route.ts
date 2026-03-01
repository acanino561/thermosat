import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { projects } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { createProjectSchema } from '@/lib/validators/projects';
import {
  getAuthenticatedUser,
  unauthorizedResponse,
  validationErrorResponse,
  serverErrorResponse,
  parseJsonBody,
} from '@/lib/utils/api-helpers';

export async function GET(): Promise<NextResponse> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const userProjects = await db
      .select()
      .from(projects)
      .where(eq(projects.userId, user.id))
      .orderBy(desc(projects.updatedAt));

    return NextResponse.json({ projects: userProjects });
  } catch (error) {
    console.error('GET /api/projects error:', error);
    return serverErrorResponse();
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const body = await parseJsonBody(request);
    if (!body) {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 },
      );
    }

    const parsed = createProjectSchema.safeParse(body);
    if (!parsed.success) {
      return validationErrorResponse(parsed.error);
    }

    const [project] = await db
      .insert(projects)
      .values({
        userId: user.id,
        name: parsed.data.name,
        description: parsed.data.description,
      })
      .returning();

    try {
      const { logAuditEvent } = await import('@/lib/audit/logger');
      await logAuditEvent({
        userId: user.id,
        action: 'project.created',
        entityType: 'project',
        entityId: project.id,
        projectId: project.id,
        orgId: project.orgId ?? undefined,
        after: project,
        ipAddress: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'unknown',
        userAgent: request.headers.get('user-agent') ?? undefined,
      });
    } catch { /* audit best-effort */ }

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    console.error('POST /api/projects error:', error);
    return serverErrorResponse();
  }
}
