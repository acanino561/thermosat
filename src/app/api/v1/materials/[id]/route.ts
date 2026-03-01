import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { materials } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { authenticateApiKey, isErrorResponse } from '@/lib/utils/v1-helpers';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams): Promise<NextResponse> {
  try {
    const auth = await authenticateApiKey(request);
    if (isErrorResponse(auth)) return auth;

    const { id } = await params;

    const [material] = await db.select().from(materials).where(eq(materials.id, id));
    if (!material) return NextResponse.json({ error: 'Material not found' }, { status: 404 });

    // Only allow access to default materials or user's own
    if (!material.isDefault && material.userId !== auth.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ data: material });
  } catch (error) {
    console.error('GET /api/v1/materials/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
