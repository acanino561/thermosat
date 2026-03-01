import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { organizations, ssoConfigs, users, orgMembers } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { parseSamlResponse } from '@/lib/auth/saml';
import { SignJWT } from 'jose';

interface RouteParams {
  params: Promise<{ orgSlug: string }>;
}

export async function POST(
  request: Request,
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
      return NextResponse.json({ error: 'SSO not configured' }, { status: 404 });
    }

    // Parse the form body to get SAMLResponse
    const formData = await request.formData();
    const samlResponse = formData.get('SAMLResponse');

    if (!samlResponse || typeof samlResponse !== 'string') {
      return NextResponse.json({ error: 'Missing SAMLResponse' }, { status: 400 });
    }

    const { email } = await parseSamlResponse(ssoConfig, orgSlug, {
      SAMLResponse: samlResponse,
    });

    if (!email) {
      return NextResponse.json({ error: 'No email in SAML assertion' }, { status: 400 });
    }

    // JIT provisioning: find or create user
    let [user] = await db.select().from(users).where(eq(users.email, email));

    if (!user) {
      const [newUser] = await db
        .insert(users)
        .values({
          email,
          name: email.split('@')[0],
          emailVerified: new Date(),
        })
        .returning();
      user = newUser;
    }

    // Add to org if not already a member
    const [existingMember] = await db
      .select()
      .from(orgMembers)
      .where(and(eq(orgMembers.orgId, org.id), eq(orgMembers.userId, user.id)));

    if (!existingMember) {
      await db.insert(orgMembers).values({
        orgId: org.id,
        userId: user.id,
        role: 'member',
        joinedAt: new Date(),
      });
    }

    // Create a short-lived JWT cookie for session bootstrap
    const secret = new TextEncoder().encode(
      process.env.NEXTAUTH_SECRET ?? 'fallback-secret',
    );
    const token = await new SignJWT({ sub: user.id, email: user.email })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('1h')
      .sign(secret);

    const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
    const response = NextResponse.redirect(`${baseUrl}/dashboard`);
    response.cookies.set('sso-session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 3600,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('SAML ACS error:', error);
    return NextResponse.json({ error: 'SAML assertion validation failed' }, { status: 500 });
  }
}
