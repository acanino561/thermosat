import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { thermalModels, thermalNodes } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { authenticateApiKey, isErrorResponse } from '@/lib/utils/v1-helpers';
import { createNodeSchema } from '@/lib/validators/nodes';
import { parseJsonBody, validationErrorResponse } from '@/lib/utils/api-helpers';
import { getUserProjectAccess, requireRole, AccessDeniedError } from '@/lib/auth/access';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams): Promise<NextResponse> {
  try {
    const auth = await authenticateApiKey(request);
    if (isErrorResponse(auth)) return auth;

    const { id } = await params;

    const [model] = await db.select().from(thermalModels).where(eq(thermalModels.id, id));
    if (!model) return NextResponse.json({ error: 'Model not found' }, { status: 404 });

    try {
      await getUserProjectAccess(auth.userId, model.projectId);
    } catch (e) {
      if (e instanceof AccessDeniedError) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      throw e;
    }

    const nodes = await db.select().from(thermalNodes).where(eq(thermalNodes.modelId, id));

    return NextResponse.json({ data: nodes });
  } catch (error) {
    console.error('GET /api/v1/models/[id]/nodes error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: RouteParams): Promise<NextResponse> {
  try {
    const auth = await authenticateApiKey(request);
    if (isErrorResponse(auth)) return auth;

    const { id } = await params;

    const [model] = await db.select().from(thermalModels).where(eq(thermalModels.id, id));
    if (!model) return NextResponse.json({ error: 'Model not found' }, { status: 404 });

    let role;
    try {
      role = await getUserProjectAccess(auth.userId, model.projectId);
    } catch (e) {
      if (e instanceof AccessDeniedError) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      throw e;
    }

    try { requireRole(role, 'editor'); } catch { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }); }

    const body = await parseJsonBody(request);
    if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });

    const items = Array.isArray(body) ? body : [body];
    const results = [];

    for (const item of items) {
      const parsed = createNodeSchema.safeParse(item);
      if (!parsed.success) return validationErrorResponse(parsed.error);
      results.push({ modelId: id, ...parsed.data });
    }

    const created = await db.insert(thermalNodes).values(results).returning();

    return NextResponse.json({ data: Array.isArray(body) ? created : created[0] }, { status: 201 });
  } catch (error) {
    console.error('POST /api/v1/models/[id]/nodes error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
