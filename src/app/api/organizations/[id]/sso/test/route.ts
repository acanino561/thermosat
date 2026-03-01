import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { orgMembers, ssoConfigs, organizations } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getSamlInstance } from '@/lib/auth/saml';
import {
  getAuthenticatedUser,
  unauthorizedResponse,
  forbiddenResponse,
  serverErrorResponse,
} from '@/lib/utils/api-helpers';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(
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
    if (!caller || (caller.role !== 'owner' && caller.role !== 'admin')) {
      return forbiddenResponse();
    }

    const [ssoConfig] = await db
      .select()
      .from(ssoConfigs)
      .where(eq(ssoConfigs.orgId, id));

    if (!ssoConfig) {
      return NextResponse.json({ error: 'SSO not configured' }, { status: 404 });
    }

    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, id));

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const saml = getSamlInstance(ssoConfig, org.slug);
    const testUrl = await saml.getAuthorizeUrlAsync('', undefined, {});

    return NextResponse.json({ data: { testUrl } });
  } catch (error) {
    console.error('POST /api/organizations/[id]/sso/test error:', error);
    return serverErrorResponse();
  }
}
