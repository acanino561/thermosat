import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { materials } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { updateMaterialSchema } from '@/lib/validators/materials';
import {
  getAuthenticatedUser,
  unauthorizedResponse,
  notFoundResponse,
  forbiddenResponse,
  validationErrorResponse,
  serverErrorResponse,
  parseJsonBody,
} from '@/lib/utils/api-helpers';

interface RouteParams {
  params: Promise<{ mid: string }>;
}

export async function PUT(
  request: Request,
  { params }: RouteParams,
): Promise<NextResponse> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const { mid } = await params;

    const [existing] = await db
      .select()
      .from(materials)
      .where(eq(materials.id, mid));
    if (!existing) return notFoundResponse('Material');

    // Can't edit default materials
    if (existing.isDefault) {
      return forbiddenResponse();
    }

    // Can only edit own materials
    if (existing.userId !== user.id) {
      return forbiddenResponse();
    }

    const body = await parseJsonBody(request);
    if (!body) {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 },
      );
    }

    const parsed = updateMaterialSchema.safeParse(body);
    if (!parsed.success) {
      return validationErrorResponse(parsed.error);
    }

    const [updated] = await db
      .update(materials)
      .set(parsed.data)
      .where(eq(materials.id, mid))
      .returning();

    return NextResponse.json({ material: updated });
  } catch (error) {
    console.error('PUT /api/materials/[mid] error:', error);
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

    const { mid } = await params;

    const [existing] = await db
      .select()
      .from(materials)
      .where(eq(materials.id, mid));
    if (!existing) return notFoundResponse('Material');

    if (existing.isDefault) {
      return forbiddenResponse();
    }

    if (existing.userId !== user.id) {
      return forbiddenResponse();
    }

    await db.delete(materials).where(eq(materials.id, mid));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/materials/[mid] error:', error);
    return serverErrorResponse();
  }
}
