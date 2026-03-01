import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { organizations, orgMembers } from '@/lib/db/schema';
import { eq, and, count } from 'drizzle-orm';
import { z } from 'zod';
import {
  getAuthenticatedUser,
  unauthorizedResponse,
  notFoundResponse,
  validationErrorResponse,
  serverErrorResponse,
  forbiddenResponse,
  parseJsonBody,
} from '@/lib/utils/api-helpers';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const updateOrgSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  logoUrl: z.string().url().nullable().optional(),
});

async function getOrgMembership(orgId: string, userId: string) {
  const [member] = await db
    .select()
    .from(orgMembers)
    .where(and(eq(orgMembers.orgId, orgId), eq(orgMembers.userId, userId)));
  return member ?? null;
}

export async function GET(
  _request: Request,
  { params }: RouteParams,
): Promise<NextResponse> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const { id } = await params;

    const member = await getOrgMembership(id, user.id);
    if (!member) return forbiddenResponse();

    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, id));
    if (!org) return notFoundResponse('Organization');

    const [{ memberCount }] = await db
      .select({ memberCount: count() })
      .from(orgMembers)
      .where(eq(orgMembers.orgId, id));

    return NextResponse.json({ data: { ...org, memberCount } });
  } catch (error) {
    console.error('GET /api/organizations/[id] error:', error);
    return serverErrorResponse();
  }
}

export async function PUT(
  request: Request,
  { params }: RouteParams,
): Promise<NextResponse> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const { id } = await params;

    const member = await getOrgMembership(id, user.id);
    if (!member) return forbiddenResponse();
    if (member.role !== 'owner' && member.role !== 'admin') {
      return forbiddenResponse();
    }

    const body = await parseJsonBody(request);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = updateOrgSchema.safeParse(body);
    if (!parsed.success) {
      return validationErrorResponse(parsed.error);
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
    if (parsed.data.logoUrl !== undefined) updateData.logoUrl = parsed.data.logoUrl;

    const [updated] = await db
      .update(organizations)
      .set(updateData)
      .where(eq(organizations.id, id))
      .returning();

    if (!updated) return notFoundResponse('Organization');

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('PUT /api/organizations/[id] error:', error);
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

    const { id } = await params;

    const member = await getOrgMembership(id, user.id);
    if (!member) return forbiddenResponse();
    if (member.role !== 'owner') {
      return forbiddenResponse();
    }

    await db.delete(organizations).where(eq(organizations.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/organizations/[id] error:', error);
    return serverErrorResponse();
  }
}
