import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { teams, orgMembers } from '@/lib/db/schema';
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

const createTeamSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

export async function GET(
  _request: Request,
  { params }: RouteParams,
): Promise<NextResponse> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const { id } = await params;

    const [caller] = await db
      .select()
      .from(orgMembers)
      .where(and(eq(orgMembers.orgId, id), eq(orgMembers.userId, user.id)));
    if (!caller) return forbiddenResponse();

    const orgTeams = await db
      .select()
      .from(teams)
      .where(eq(teams.orgId, id));

    return NextResponse.json({ data: orgTeams });
  } catch (error) {
    console.error('GET /api/organizations/[id]/teams error:', error);
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

    const parsed = createTeamSchema.safeParse(body);
    if (!parsed.success) {
      return validationErrorResponse(parsed.error);
    }

    const [team] = await db
      .insert(teams)
      .values({
        orgId: id,
        name: parsed.data.name,
        description: parsed.data.description ?? null,
      })
      .returning();

    return NextResponse.json({ data: team }, { status: 201 });
  } catch (error) {
    console.error('POST /api/organizations/[id]/teams error:', error);
    return serverErrorResponse();
  }
}
