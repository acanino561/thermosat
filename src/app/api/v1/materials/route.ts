import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { materials } from '@/lib/db/schema';
import { eq, or } from 'drizzle-orm';
import { authenticateApiKey, isErrorResponse } from '@/lib/utils/v1-helpers';
import { createMaterialSchema } from '@/lib/validators/materials';
import { parseJsonBody, validationErrorResponse } from '@/lib/utils/api-helpers';

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const auth = await authenticateApiKey(request);
    if (isErrorResponse(auth)) return auth;

    const rows = await db
      .select()
      .from(materials)
      .where(or(eq(materials.isDefault, true), eq(materials.userId, auth.userId)));

    return NextResponse.json({ data: rows });
  } catch (error) {
    console.error('GET /api/v1/materials error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const auth = await authenticateApiKey(request);
    if (isErrorResponse(auth)) return auth;

    const body = await parseJsonBody(request);
    if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });

    const parsed = createMaterialSchema.safeParse(body);
    if (!parsed.success) return validationErrorResponse(parsed.error);

    const [material] = await db
      .insert(materials)
      .values({
        ...parsed.data,
        userId: auth.userId,
        isDefault: false,
      })
      .returning();

    return NextResponse.json({ data: material }, { status: 201 });
  } catch (error) {
    console.error('POST /api/v1/materials error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
