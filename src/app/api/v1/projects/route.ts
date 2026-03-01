import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { projects } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { authenticateApiKey, isErrorResponse } from '@/lib/utils/v1-helpers';
import { createProjectSchema } from '@/lib/validators/projects';
import { parseJsonBody, validationErrorResponse } from '@/lib/utils/api-helpers';

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const auth = await authenticateApiKey(request);
    if (isErrorResponse(auth)) return auth;

    const rows = await db
      .select()
      .from(projects)
      .where(eq(projects.userId, auth.userId));

    return NextResponse.json({ data: rows });
  } catch (error) {
    console.error('GET /api/v1/projects error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const auth = await authenticateApiKey(request);
    if (isErrorResponse(auth)) return auth;

    const body = await parseJsonBody(request);
    if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });

    const parsed = createProjectSchema.safeParse(body);
    if (!parsed.success) return validationErrorResponse(parsed.error);

    const [project] = await db
      .insert(projects)
      .values({
        userId: auth.userId,
        orgId: auth.orgId,
        name: parsed.data.name,
        description: parsed.data.description,
      })
      .returning();

    return NextResponse.json({ data: project }, { status: 201 });
  } catch (error) {
    console.error('POST /api/v1/projects error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
