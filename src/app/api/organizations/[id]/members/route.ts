import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { orgMembers, users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import {
  getAuthenticatedUser,
  unauthorizedResponse,
  validationErrorResponse,
  serverErrorResponse,
  forbiddenResponse,
  parseJsonBody,
} from '@/lib/utils/api-helpers';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'member']).default('member'),
});

export async function GET(
  _request: Request,
  { params }: RouteParams,
): Promise<NextResponse> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const { id } = await params;

    // Verify caller is a member
    const [caller] = await db
      .select()
      .from(orgMembers)
      .where(and(eq(orgMembers.orgId, id), eq(orgMembers.userId, user.id)));
    if (!caller) return forbiddenResponse();

    const members = await db
      .select({
        id: orgMembers.id,
        userId: orgMembers.userId,
        role: orgMembers.role,
        invitedAt: orgMembers.invitedAt,
        joinedAt: orgMembers.joinedAt,
        userName: users.name,
        userEmail: users.email,
        userImage: users.image,
      })
      .from(orgMembers)
      .innerJoin(users, eq(orgMembers.userId, users.id))
      .where(eq(orgMembers.orgId, id));

    return NextResponse.json({ data: members });
  } catch (error) {
    console.error('GET /api/organizations/[id]/members error:', error);
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

    const { id } = await params;

    // Verify caller is admin+
    const [caller] = await db
      .select()
      .from(orgMembers)
      .where(and(eq(orgMembers.orgId, id), eq(orgMembers.userId, user.id)));
    if (!caller) return forbiddenResponse();
    if (caller.role !== 'owner' && caller.role !== 'admin') {
      return forbiddenResponse();
    }

    const body = await parseJsonBody(request);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = inviteMemberSchema.safeParse(body);
    if (!parsed.success) {
      return validationErrorResponse(parsed.error);
    }

    // Find user by email
    const [targetUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, parsed.data.email));
    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found with this email' },
        { status: 404 },
      );
    }

    // Check if already a member
    const [existingMember] = await db
      .select()
      .from(orgMembers)
      .where(
        and(eq(orgMembers.orgId, id), eq(orgMembers.userId, targetUser.id)),
      );
    if (existingMember) {
      return NextResponse.json(
        { error: 'User is already a member of this organization' },
        { status: 409 },
      );
    }

    const [invite] = await db
      .insert(orgMembers)
      .values({
        orgId: id,
        userId: targetUser.id,
        role: parsed.data.role,
        invitedAt: new Date(),
        joinedAt: null, // null until accepted
      })
      .returning();

    return NextResponse.json({ data: invite }, { status: 201 });
  } catch (error) {
    console.error('POST /api/organizations/[id]/members error:', error);
    return serverErrorResponse();
  }
}
