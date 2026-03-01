import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { ssoConfigs, organizations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email || !email.includes('@')) {
      return NextResponse.json({ ssoRequired: false });
    }

    const domain = email.split('@')[1].toLowerCase();

    // Find orgs with SSO enabled and domain enforced
    // We check all sso configs and match by org slug/domain pattern
    const configs = await db
      .select({
        orgId: ssoConfigs.orgId,
        domainEnforced: ssoConfigs.domainEnforced,
        enabled: ssoConfigs.enabled,
        orgSlug: organizations.slug,
        orgName: organizations.name,
      })
      .from(ssoConfigs)
      .innerJoin(organizations, eq(ssoConfigs.orgId, organizations.id))
      .where(eq(ssoConfigs.domainEnforced, true));

    // Match org whose slug contains the domain prefix or whose name matches
    // In a production system you'd store allowed domains explicitly;
    // here we match if the org slug matches the email domain prefix
    const matching = configs.find((c) => {
      const domainPrefix = domain.split('.')[0];
      return (
        c.enabled &&
        (c.orgSlug === domainPrefix ||
          c.orgSlug === domain.replace(/\./g, '-') ||
          c.orgName.toLowerCase().replace(/[^a-z0-9]/g, '-') === domainPrefix)
      );
    });

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
