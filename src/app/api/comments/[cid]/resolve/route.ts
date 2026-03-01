import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { modelComments, thermalModels } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
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

export async function POST(_request: Request, { params }: RouteParams): Promise<NextResponse> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const { cid } = await params;

    const [comment] = await db.select().from(modelComments).where(eq(modelComments.id, cid));
    if (!comment) return notFoundResponse('Comment');

    const [model] = await db.select().from(thermalModels).where(eq(thermalModels.id, comment.modelId));
    if (!model) return notFoundResponse('Model');

    try {
      const role = await getUserProjectAccess(user.id, model.projectId);
      requireRole(role, 'editor');
    } catch (e) {
      if (e instanceof AccessDeniedError) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      throw e;
    }

    const [updated] = await db
      .update(modelComments)
      .set({ resolved: true, resolvedBy: user.id, resolvedAt: new Date() })
      .where(eq(modelComments.id, cid))
      .returning();

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('POST /api/comments/[cid]/resolve error:', error);
    return serverErrorResponse();
  }
}
