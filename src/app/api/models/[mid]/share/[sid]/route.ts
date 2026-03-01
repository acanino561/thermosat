import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { shareLinks, thermalModels } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import {
  getAuthenticatedUser,
  unauthorizedResponse,
  notFoundResponse,
  serverErrorResponse,
} from '@/lib/utils/api-helpers';
import { getUserProjectAccess, requireRole, AccessDeniedError } from '@/lib/auth/access';

interface RouteParams {
  params: Promise<{ mid: string; sid: string }>;
}

export async function DELETE(_request: Request, { params }: RouteParams): Promise<NextResponse> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const { mid, sid } = await params;

    const [model] = await db.select().from(thermalModels).where(eq(thermalModels.id, mid));
    if (!model) return notFoundResponse('Model');

    try {
      const role = await getUserProjectAccess(user.id, model.projectId);
      requireRole(role, 'editor');
    } catch (e) {
      if (e instanceof AccessDeniedError) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      throw e;
    }

    const [link] = await db.select().from(shareLinks).where(eq(shareLinks.id, sid));
    if (!link || link.modelId !== mid) return notFoundResponse('Share link');

    await db.update(shareLinks).set({ revokedAt: new Date() }).where(eq(shareLinks.id, sid));

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error('DELETE /api/models/[mid]/share/[sid] error:', error);
    return serverErrorResponse();
  }
}
