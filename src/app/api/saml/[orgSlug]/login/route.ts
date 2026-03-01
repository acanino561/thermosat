import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { organizations, ssoConfigs } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getSamlInstance } from '@/lib/auth/saml';

interface RouteParams {
  params: Promise<{ orgSlug: string }>;
}

export async function GET(
  _request: Request,
  { params }: RouteParams,
): Promise<NextResponse> {
  try {
    const { orgSlug } = await params;

    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.slug, orgSlug));

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const [ssoConfig] = await db
      .select()
      .from(ssoConfigs)
      .where(eq(ssoConfigs.orgId, org.id));

    if (!ssoConfig || !ssoConfig.enabled) {
      return NextResponse.json({ error: 'SSO is not configured for this organization' }, { status: 404 });
    }

    const saml = getSamlInstance(ssoConfig, orgSlug);
    const authUrl = await saml.getAuthorizeUrlAsync('', undefined, {});

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('SAML login error:', error);
    return NextResponse.json({ error: 'Failed to initiate SAML login' }, { status: 500 });
  }
}
