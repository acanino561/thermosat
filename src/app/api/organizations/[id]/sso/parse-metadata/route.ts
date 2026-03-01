import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { orgMembers } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { parseIdPMetadata } from '@/lib/auth/saml';
import {
  getAuthenticatedUser,
  unauthorizedResponse,
  forbiddenResponse,
  serverErrorResponse,
  parseJsonBody,
} from '@/lib/utils/api-helpers';

interface RouteParams {
  params: Promise<{ id: string }>;
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
    if (!caller || (caller.role !== 'owner' && caller.role !== 'admin')) {
      return forbiddenResponse();
    }

    const body = await parseJsonBody<{ metadataXml?: string }>(request);
    if (!body || !body.metadataXml) {
      return NextResponse.json({ error: 'metadataXml is required' }, { status: 400 });
    }

    const result = await parseIdPMetadata(body.metadataXml);
    return NextResponse.json({ data: result });
  } catch (error) {
    console.error('POST /api/organizations/[id]/sso/parse-metadata error:', error);
    const message = error instanceof Error ? error.message : 'Failed to parse metadata';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
