import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { projects } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { authenticateApiKey, isErrorResponse } from '@/lib/utils/v1-helpers';
import { updateProjectSchema } from '@/lib/validators/projects';
import { parseJsonBody, validationErrorResponse } from '@/lib/utils/api-helpers';
import { getUserProjectAccess, requireRole, AccessDeniedError } from '@/lib/auth/access';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams): Promise<NextResponse> {
  try {
    const auth = await authenticateApiKey(request);
    if (isErrorResponse(auth)) return auth;

    const { id } = await params;

    try {
      await getUserProjectAccess(auth.userId, id);
    } catch (e) {
      if (e instanceof AccessDeniedError) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      throw e;
    }

    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    return NextResponse.json({ data: project });
  } catch (error) {
    console.error('GET /api/v1/projects/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: RouteParams): Promise<NextResponse> {
  try {
    const auth = await authenticateApiKey(request);
    if (isErrorResponse(auth)) return auth;

    const { id } = await params;

    let role;
    try {
      role = await getUserProjectAccess(auth.userId, id);
    } catch (e) {
      if (e instanceof AccessDeniedError) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      throw e;
    }

    try { requireRole(role, 'editor'); } catch { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }); }

    const body = await parseJsonBody(request);
    if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });

    const parsed = updateProjectSchema.safeParse(body);
    if (!parsed.success) return validationErrorResponse(parsed.error);

    const [updated] = await db
      .update(projects)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();

    if (!updated) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('PUT /api/v1/projects/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams): Promise<NextResponse> {
  try {
    const auth = await authenticateApiKey(request);
    if (isErrorResponse(auth)) return auth;

    const { id } = await params;

    let role;
    try {
      role = await getUserProjectAccess(auth.userId, id);
    } catch (e) {
      if (e instanceof AccessDeniedError) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      throw e;
    }

    try { requireRole(role, 'owner'); } catch { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }); }

    await db.delete(projects).where(eq(projects.id, id));

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error('DELETE /api/v1/projects/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
