import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { shareLinks, thermalModels } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import {
  getAuthenticatedUser,
  unauthorizedResponse,
  notFoundResponse,
  serverErrorResponse,
} from '@/lib/utils/api-helpers';
import { getUserProjectAccess, requireRole, AccessDeniedError } from '@/lib/auth/access';
import { generateShareToken } from '@/lib/share/token';

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

    const links = await db.select().from(shareLinks).where(eq(shareLinks.modelId, mid));

    return NextResponse.json({ data: links });
  } catch (error) {
    console.error('GET /api/models/[mid]/share error:', error);
    return serverErrorResponse();
  }
}

const createShareSchema = z.object({
  permission: z.enum(['view', 'edit']),
  expiresAt: z.string().datetime().optional(),
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
    const parsed = createShareSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    }

    const token = generateShareToken();

    const [link] = await db
      .insert(shareLinks)
      .values({
        modelId: mid,
        userId: user.id,
        permission: parsed.data.permission,
        token,
        expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
      })
      .returning();

    return NextResponse.json({ data: { shareUrl: '/share/' + token, token, id: link.id } }, { status: 201 });
  } catch (error) {
    console.error('POST /api/models/[mid]/share error:', error);
    return serverErrorResponse();
  }
}
