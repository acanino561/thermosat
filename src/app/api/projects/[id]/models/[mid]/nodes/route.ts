import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { thermalNodes } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { createNodeSchema } from '@/lib/validators/nodes';
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

    const nodes = await db
      .select()
      .from(thermalNodes)
      .where(eq(thermalNodes.modelId, mid));

    return NextResponse.json({ nodes });
  } catch (error) {
    console.error('GET /api/.../nodes error:', error);
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

    const parsed = createNodeSchema.safeParse(body);
    if (!parsed.success) {
      return validationErrorResponse(parsed.error);
    }

    const [node] = await db
      .insert(thermalNodes)
      .values({
        modelId: mid,
        name: parsed.data.name,
        nodeType: parsed.data.nodeType,
        temperature: parsed.data.temperature,
        capacitance: parsed.data.capacitance ?? null,
        boundaryTemp: parsed.data.boundaryTemp ?? null,
        materialId: parsed.data.materialId ?? null,
        area: parsed.data.area ?? null,
        mass: parsed.data.mass ?? null,
        absorptivity: parsed.data.absorptivity ?? null,
        emissivity: parsed.data.emissivity ?? null,
      })
      .returning();

    try {
      const { logAuditEvent } = await import('@/lib/audit/logger');
      await logAuditEvent({
        userId: user.id,
        action: 'node.created',
        entityType: 'node',
        entityId: node.id,
        projectId: id,
        modelId: mid,
        after: node,
        ipAddress: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'unknown',
        userAgent: request.headers.get('user-agent') ?? undefined,
      });
    } catch { /* audit best-effort */ }

    return NextResponse.json({ node }, { status: 201 });
  } catch (error) {
    console.error('POST /api/.../nodes error:', error);
    return serverErrorResponse();
  }
}
