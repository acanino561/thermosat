import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { simulationConfigs, thermalModels } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import {
  getAuthenticatedUser,
  unauthorizedResponse,
  notFoundResponse,
  serverErrorResponse,
  verifyProjectOwnership,
  parseJsonBody,
} from '@/lib/utils/api-helpers';

interface RouteParams {
  params: Promise<{ id: string; mid: string }>;
}

export async function GET(
  request: Request,
  { params }: RouteParams,
): Promise<NextResponse> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const { id, mid } = await params;
    const project = await verifyProjectOwnership(id, user.id);
    if (!project) return notFoundResponse('Project');

    const configs = await db
      .select()
      .from(simulationConfigs)
      .where(eq(simulationConfigs.modelId, mid));

    return NextResponse.json(configs);
  } catch (error) {
    console.error('GET /api/.../simulation-configs error:', error);
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

    const { id, mid } = await params;
    const project = await verifyProjectOwnership(id, user.id);
    if (!project) return notFoundResponse('Project');

    const [model] = await db
      .select()
      .from(thermalModels)
      .where(and(eq(thermalModels.id, mid), eq(thermalModels.projectId, id)));
    if (!model) return notFoundResponse('Model');

    const body = await parseJsonBody(request);
    if (!body || !(body as any).config) {
      return NextResponse.json({ error: 'Config is required' }, { status: 400 });
    }

    const { name, config } = body as { name?: string; config: any };

    const [created] = await db
      .insert(simulationConfigs)
      .values({
        modelId: mid,
        name: name || 'Default',
        config,
      })
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('POST /api/.../simulation-configs error:', error);
    return serverErrorResponse();
  }
}
