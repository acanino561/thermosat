import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { heatLoads } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { createHeatLoadSchema } from '@/lib/validators/heat-loads';
import {
  getAuthenticatedUser,
  unauthorizedResponse,
  notFoundResponse,
  validationErrorResponse,
  serverErrorResponse,
  verifyProjectOwnership,
  verifyModelOwnership,
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
    const model = await verifyModelOwnership(mid, id);
    if (!model) return notFoundResponse('Model');

    const loads = await db
      .select()
      .from(heatLoads)
      .where(eq(heatLoads.modelId, mid));

    return NextResponse.json({ heatLoads: loads });
  } catch (error) {
    console.error('GET /api/.../heat-loads error:', error);
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
    const model = await verifyModelOwnership(mid, id);
    if (!model) return notFoundResponse('Model');

    const body = await parseJsonBody(request);
    if (!body) {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 },
      );
    }

    const parsed = createHeatLoadSchema.safeParse(body);
    if (!parsed.success) {
      return validationErrorResponse(parsed.error);
    }

    const [load] = await db
      .insert(heatLoads)
      .values({
        modelId: mid,
        name: parsed.data.name,
        nodeId: parsed.data.nodeId,
        loadType: parsed.data.loadType,
        value: parsed.data.value ?? null,
        timeValues: parsed.data.timeValues ?? null,
        orbitalParams: parsed.data.orbitalParams ?? null,
      })
      .returning();

    return NextResponse.json({ heatLoad: load }, { status: 201 });
  } catch (error) {
    console.error('POST /api/.../heat-loads error:', error);
    return serverErrorResponse();
  }
}
