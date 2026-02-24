import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { thermalModels, thermalNodes, conductors, heatLoads } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { updateModelSchema } from '@/lib/validators/models';
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
  params: Promise<{ id: string; mid: string }>;
}

export async function GET(
  _request: Request,
  { params }: RouteParams,
): Promise<NextResponse> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const { id, mid } = await params;
    const project = await verifyProjectOwnership(id, user.id);
    if (!project) return notFoundResponse('Project');

    const [model] = await db
      .select()
      .from(thermalModels)
      .where(
        and(eq(thermalModels.id, mid), eq(thermalModels.projectId, id)),
      );
    if (!model) return notFoundResponse('Model');

    // Fetch children
    const nodes = await db
      .select()
      .from(thermalNodes)
      .where(eq(thermalNodes.modelId, mid));

    const modelConductors = await db
      .select()
      .from(conductors)
      .where(eq(conductors.modelId, mid));

    const loads = await db
      .select()
      .from(heatLoads)
      .where(eq(heatLoads.modelId, mid));

    return NextResponse.json({
      model,
      nodes,
      conductors: modelConductors,
      heatLoads: loads,
    });
  } catch (error) {
    console.error('GET /api/projects/[id]/models/[mid] error:', error);
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

    const { id, mid } = await params;
    const project = await verifyProjectOwnership(id, user.id);
    if (!project) return notFoundResponse('Project');

    const body = await parseJsonBody(request);
    if (!body) {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 },
      );
    }

    const parsed = updateModelSchema.safeParse(body);
    if (!parsed.success) {
      return validationErrorResponse(parsed.error);
    }

    const [existing] = await db
      .select()
      .from(thermalModels)
      .where(
        and(eq(thermalModels.id, mid), eq(thermalModels.projectId, id)),
      );
    if (!existing) return notFoundResponse('Model');

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };
    if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
    if (parsed.data.description !== undefined)
      updateData.description = parsed.data.description;
    if (parsed.data.orbitalConfig !== undefined)
      updateData.orbitalConfig = parsed.data.orbitalConfig;

    const [updated] = await db
      .update(thermalModels)
      .set(updateData)
      .where(eq(thermalModels.id, mid))
      .returning();

    return NextResponse.json({ model: updated });
  } catch (error) {
    console.error('PUT /api/projects/[id]/models/[mid] error:', error);
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

    const { id, mid } = await params;
    const project = await verifyProjectOwnership(id, user.id);
    if (!project) return notFoundResponse('Project');

    const [existing] = await db
      .select()
      .from(thermalModels)
      .where(
        and(eq(thermalModels.id, mid), eq(thermalModels.projectId, id)),
      );
    if (!existing) return notFoundResponse('Model');

    await db.delete(thermalModels).where(eq(thermalModels.id, mid));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/projects/[id]/models/[mid] error:', error);
    return serverErrorResponse();
  }
}
