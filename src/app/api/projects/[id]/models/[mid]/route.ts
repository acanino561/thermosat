import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import {
  thermalModels,
  thermalNodes,
  conductors,
  heatLoads,
  modelSnapshots,
} from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
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

    const body = await parseJsonBody<Record<string, unknown>>(request);
    if (!body) {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 },
      );
    }

    const [existing] = await db
      .select()
      .from(thermalModels)
      .where(
        and(eq(thermalModels.id, mid), eq(thermalModels.projectId, id)),
      );
    if (!existing) return notFoundResponse('Model');

    // Check if this is a full model save (has nodes/conductors/heatLoads)
    if (body.nodes && body.conductors && body.heatLoads) {
      // Full model state save
      const snapshotDescription = (body.snapshotDescription as string) || 'Auto-save';
      const createSnapshot = body.createSnapshot !== false;

      // Update model timestamp and increment version
      const newVersion = existing.version + 1;
      const [updated] = await db
        .update(thermalModels)
        .set({ updatedAt: new Date(), version: newVersion })
        .where(eq(thermalModels.id, mid))
        .returning();

      // Create snapshot if requested
      if (createSnapshot) {
        await db.insert(modelSnapshots).values({
          modelId: mid,
          version: newVersion,
          description: snapshotDescription,
          snapshot: {
            nodes: body.nodes as unknown[],
            conductors: body.conductors as unknown[],
            heatLoads: body.heatLoads as unknown[],
            orbitalConfig: existing.orbitalConfig,
          },
        });
      }

      return NextResponse.json({
        model: updated,
        savedAt: new Date().toISOString(),
      });
    }

    // Metadata-only update
    const parsed = updateModelSchema.safeParse(body);
    if (!parsed.success) {
      return validationErrorResponse(parsed.error);
    }

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
