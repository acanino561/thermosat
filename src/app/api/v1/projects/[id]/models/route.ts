import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { thermalModels } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { authenticateApiKey, isErrorResponse } from '@/lib/utils/v1-helpers';
import { createModelSchema } from '@/lib/validators/models';
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

    try {
      await getUserProjectAccess(auth.userId, id);
    } catch (e) {
      if (e instanceof AccessDeniedError) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      throw e;
    }

    const models = await db.select().from(thermalModels).where(eq(thermalModels.projectId, id));

    return NextResponse.json({ data: models });
  } catch (error) {
    console.error('GET /api/v1/projects/[id]/models error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: RouteParams): Promise<NextResponse> {
  try {
    const auth = await authenticateApiKey(request);
    if (isErrorResponse(auth)) return auth;

    const { id } = await params;

    let role;
    try {
      role = await getUserProjectAccess(auth.userId, id);
    } catch (e) {
      if (e instanceof AccessDeniedError) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      throw e;
    }

    try { requireRole(role, 'editor'); } catch { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }); }

    const body = await parseJsonBody(request);
    if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });

    const parsed = createModelSchema.safeParse(body);
    if (!parsed.success) return validationErrorResponse(parsed.error);

    const [model] = await db
      .insert(thermalModels)
      .values({
        projectId: id,
        name: parsed.data.name,
        description: parsed.data.description,
        orbitalConfig: parsed.data.orbitalConfig ?? null,
      })
      .returning();

    return NextResponse.json({ data: model }, { status: 201 });
  } catch (error) {
    console.error('POST /api/v1/projects/[id]/models error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
