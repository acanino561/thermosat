import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { reviewStatuses, thermalModels } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { z } from 'zod';
import {
  getAuthenticatedUser,
  unauthorizedResponse,
  notFoundResponse,
  serverErrorResponse,
} from '@/lib/utils/api-helpers';
import { getUserProjectAccess, requireRole, AccessDeniedError } from '@/lib/auth/access';

interface RouteParams {
  params: Promise<{ mid: string }>;
}

export async function GET(_request: Request, { params }: RouteParams): Promise<NextResponse> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const { mid } = await params;

    const [model] = await db.select().from(thermalModels).where(eq(thermalModels.id, mid));
    if (!model) return notFoundResponse('Model');

    try {
      await getUserProjectAccess(user.id, model.projectId);
    } catch (e) {
      if (e instanceof AccessDeniedError) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      throw e;
    }

    const [latest] = await db
      .select()
      .from(reviewStatuses)
      .where(eq(reviewStatuses.modelId, mid))
      .orderBy(desc(reviewStatuses.createdAt))
      .limit(1);

    return NextResponse.json({ data: latest ?? { status: 'draft' } });
  } catch (error) {
    console.error('GET /api/models/[mid]/review-status error:', error);
    return serverErrorResponse();
  }
}

const reviewStatusSchema = z.object({
  status: z.enum(['draft', 'in_review', 'approved', 'needs_changes']),
  note: z.string().optional(),
});

export async function POST(request: Request, { params }: RouteParams): Promise<NextResponse> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const { mid } = await params;

    const [model] = await db.select().from(thermalModels).where(eq(thermalModels.id, mid));
    if (!model) return notFoundResponse('Model');

    try {
      const role = await getUserProjectAccess(user.id, model.projectId);
      requireRole(role, 'editor');
    } catch (e) {
      if (e instanceof AccessDeniedError) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      throw e;
    }

    const body = await request.json();
    const parsed = reviewStatusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    }

    const [row] = await db
      .insert(reviewStatuses)
      .values({
        modelId: mid,
        status: parsed.data.status,
        changedBy: user.id,
        note: parsed.data.note ?? null,
      })
      .returning();

    try {
      const { logAuditEvent } = await import('@/lib/audit/logger');
      await logAuditEvent({
        userId: user.id,
        action: 'review_status.changed',
        entityType: 'review_status',
        entityId: row.id,
        projectId: model.projectId,
        modelId: mid,
        after: row,
        ipAddress: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'unknown',
        userAgent: request.headers.get('user-agent') ?? undefined,
      });
    } catch { /* audit best-effort */ }

    return NextResponse.json({ data: row }, { status: 201 });
  } catch (error) {
    console.error('POST /api/models/[mid]/review-status error:', error);
    return serverErrorResponse();
  }
}
