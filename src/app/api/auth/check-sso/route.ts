import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { ssoConfigs, organizations } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email || !email.includes('@')) {
      return NextResponse.json({ ssoRequired: false });
    }

    const domain = email.split('@')[1].toLowerCase();

    // Find orgs with SSO enabled, domain enforced, and whose allowedDomains contain this domain
    const [matching] = await db
      .select({
        orgSlug: organizations.slug,
      })
      .from(ssoConfigs)
      .innerJoin(organizations, eq(ssoConfigs.orgId, organizations.id))
      .where(
        and(
          eq(ssoConfigs.enabled, true),
          eq(ssoConfigs.domainEnforced, true),
          sql`${domain} = ANY(${ssoConfigs.allowedDomains})`,
        ),
      )
      .limit(1);

    if (matching) {
      return NextResponse.json({
        ssoRequired: true,
        orgSlug: matching.orgSlug,
      });
    }

    return NextResponse.json({ ssoRequired: false });
  } catch (error) {
    console.error('GET /api/auth/check-sso error:', error);
    return NextResponse.json({ ssoRequired: false });
  }
}
