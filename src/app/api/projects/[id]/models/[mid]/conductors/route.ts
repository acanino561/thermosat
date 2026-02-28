import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { conductors } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { createConductorSchema } from '@/lib/validators/conductors';
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

    const modelConductors = await db
      .select()
      .from(conductors)
      .where(eq(conductors.modelId, mid));

    return NextResponse.json({ conductors: modelConductors });
  } catch (error) {
    console.error('GET /api/.../conductors error:', error);
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

    const parsed = createConductorSchema.safeParse(body);
    if (!parsed.success) {
      return validationErrorResponse(parsed.error);
    }

    const [conductor] = await db
      .insert(conductors)
      .values({
        modelId: mid,
        name: parsed.data.name,
        conductorType: parsed.data.conductorType,
        nodeFromId: parsed.data.nodeFromId,
        nodeToId: parsed.data.nodeToId,
        conductance: parsed.data.conductance ?? null,
        area: parsed.data.area ?? null,
        viewFactor: parsed.data.viewFactor ?? null,
        emissivity: parsed.data.emissivity ?? null,
        conductanceData: parsed.data.conductanceData ?? null,
      })
      .returning();

    return NextResponse.json({ conductor }, { status: 201 });
  } catch (error) {
    console.error('POST /api/.../conductors error:', error);
    return serverErrorResponse();
  }
}
