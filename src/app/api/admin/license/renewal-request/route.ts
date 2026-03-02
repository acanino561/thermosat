import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { db } from '@/lib/db/client';
import { orgMembers, users, organizations } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { createHash } from 'crypto';
import { hostname } from 'os';
import { getLicenseStatus } from '@/lib/license/validate';

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [user] = await db.select().from(users).where(eq(users.email, session.user.email));
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const [membership] = await db
    .select()
    .from(orgMembers)
    .where(and(eq(orgMembers.userId, user.id), eq(orgMembers.role, 'owner')));

  if (!membership) {
    return NextResponse.json({ error: 'Only organization owners can generate renewal requests' }, { status: 403 });
  }

  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, membership.orgId));

  if (!org) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
  }

  const licenseStatus = await getLicenseStatus();

  // Machine fingerprint: hash of hostname + org ID (stable across restarts)
  const fingerprint = createHash('sha256')
    .update(`${hostname()}:${org.id}`)
    .digest('hex')
    .substring(0, 32);

  const renewalRequest = {
    version: 1,
    type: 'verixos-license-renewal-request',
    orgName: org.name,
    orgSlug: org.slug,
    machineFingerprint: fingerprint,
    currentLicense: licenseStatus.valid
      ? {
          tier: licenseStatus.tier,
          seats: licenseStatus.seats,
          expiresAt: licenseStatus.expiresAt?.toISOString(),
        }
      : null,
    requestedSeats: licenseStatus.seats ?? 10,
    generatedAt: new Date().toISOString(),
  };

  const filename = `${org.slug}-renewal-${new Date().toISOString().split('T')[0]}.vxlr`;

  return new NextResponse(JSON.stringify(renewalRequest, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
