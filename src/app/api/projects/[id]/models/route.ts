import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { thermalModels } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { createModelSchema } from '@/lib/validators/models';
import {
  getAuthenticatedUser,
  unauthorizedResponse,
  notFoundResponse,
  validationErrorResponse,
  serverErrorResponse,
  verifyProjectOwnership,
  parseJsonBody,
} from '@/lib/utils/api-helpers';

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
    const project = await verifyProjectOwnership(id, user.id);
    if (!project) return notFoundResponse('Project');

    const models = await db
      .select()
      .from(thermalModels)
      .where(eq(thermalModels.projectId, id))
      .orderBy(desc(thermalModels.updatedAt));

    return NextResponse.json({ models });
  } catch (error) {
    console.error('GET /api/projects/[id]/models error:', error);
    return serverErrorResponse();
  }
}

export async function POST(
  request: Request,
  { params }: RouteParams,
): Promise<NextResponse> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const { id } = await params;
    const project = await verifyProjectOwnership(id, user.id);
    if (!project) return notFoundResponse('Project');

    const body = await parseJsonBody(request);
    if (!body) {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 },
      );
    }

    const parsed = createModelSchema.safeParse(body);
    if (!parsed.success) {
      return validationErrorResponse(parsed.error);
    }

    const [model] = await db
      .insert(thermalModels)
      .values({
        projectId: id,
        name: parsed.data.name,
        description: parsed.data.description,
        orbitalConfig: parsed.data.orbitalConfig ?? null,
      })
      .returning();

    return NextResponse.json({ model }, { status: 201 });
  } catch (error) {
    console.error('POST /api/projects/[id]/models error:', error);
    return serverErrorResponse();
  }
}
