import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { modelComments, thermalModels, users } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { z } from 'zod';
import {
  getAuthenticatedUser,
  unauthorizedResponse,
  notFoundResponse,
  serverErrorResponse,
} from '@/lib/utils/api-helpers';
import { getUserProjectAccess, AccessDeniedError } from '@/lib/auth/access';

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

    const comments = await db
      .select({
        id: modelComments.id,
        modelId: modelComments.modelId,
        userId: modelComments.userId,
        parentId: modelComments.parentId,
        position3d: modelComments.position3d,
        nodeId: modelComments.nodeId,
        content: modelComments.content,
        mentions: modelComments.mentions,
        resolved: modelComments.resolved,
        resolvedBy: modelComments.resolvedBy,
        resolvedAt: modelComments.resolvedAt,
        createdAt: modelComments.createdAt,
        updatedAt: modelComments.updatedAt,
        userName: users.name,
        userEmail: users.email,
      })
      .from(modelComments)
      .leftJoin(users, eq(modelComments.userId, users.id))
      .where(eq(modelComments.modelId, mid))
      .orderBy(asc(modelComments.createdAt));

    return NextResponse.json({ data: comments });
  } catch (error) {
    console.error('GET /api/models/[mid]/comments error:', error);
    return serverErrorResponse();
  }
}

const createCommentSchema = z.object({
  content: z.string().min(1).max(10000),
  parentId: z.string().uuid().optional(),
  position3d: z.object({ x: z.number(), y: z.number(), z: z.number() }).optional(),
  nodeId: z.string().uuid().optional(),
  mentions: z.array(z.string()).optional(),
});

export async function POST(request: Request, { params }: RouteParams): Promise<NextResponse> {
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

    const body = await request.json();
    const parsed = createCommentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    }

    const [comment] = await db
      .insert(modelComments)
      .values({
        modelId: mid,
        userId: user.id,
        content: parsed.data.content,
        parentId: parsed.data.parentId ?? null,
        position3d: parsed.data.position3d ?? null,
        nodeId: parsed.data.nodeId ?? null,
        mentions: parsed.data.mentions ?? [],
      })
      .returning();

    return NextResponse.json({ data: comment }, { status: 201 });
  } catch (error) {
    console.error('POST /api/models/[mid]/comments error:', error);
    return serverErrorResponse();
  }
}
