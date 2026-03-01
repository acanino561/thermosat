import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { modelComments, thermalModels } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import {
  getAuthenticatedUser,
  unauthorizedResponse,
  notFoundResponse,
  serverErrorResponse,
} from '@/lib/utils/api-helpers';
import { getUserProjectAccess, requireRole, AccessDeniedError } from '@/lib/auth/access';

interface RouteParams {
  params: Promise<{ cid: string }>;
}

export async function PUT(request: Request, { params }: RouteParams): Promise<NextResponse> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const { cid } = await params;

    const [comment] = await db.select().from(modelComments).where(eq(modelComments.id, cid));
    if (!comment) return notFoundResponse('Comment');

    if (comment.userId !== user.id) {
      return NextResponse.json({ error: 'Only the comment author can edit' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = z.object({ content: z.string().min(1).max(10000) }).safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    }

    const [updated] = await db
      .update(modelComments)
      .set({ content: parsed.data.content, updatedAt: new Date() })
      .where(eq(modelComments.id, cid))
      .returning();

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('PUT /api/comments/[cid] error:', error);
    return serverErrorResponse();
  }
}

export async function DELETE(_request: Request, { params }: RouteParams): Promise<NextResponse> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const { cid } = await params;

    const [comment] = await db.select().from(modelComments).where(eq(modelComments.id, cid));
    if (!comment) return notFoundResponse('Comment');

    // Comment author can always delete
    if (comment.userId === user.id) {
      await db.delete(modelComments).where(eq(modelComments.id, cid));
      return NextResponse.json({ data: { success: true } });
    }

    // Otherwise, need admin+ on the project
    const [model] = await db.select().from(thermalModels).where(eq(thermalModels.id, comment.modelId));
    if (!model) return notFoundResponse('Model');

    try {
      const role = await getUserProjectAccess(user.id, model.projectId);
      requireRole(role, 'admin');
    } catch (e) {
      if (e instanceof AccessDeniedError) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      throw e;
    }

    await db.delete(modelComments).where(eq(modelComments.id, cid));
    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error('DELETE /api/comments/[cid] error:', error);
    return serverErrorResponse();
  }
}
