import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { db } from '@/lib/db/client';
import { orgMembers, users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
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
    return NextResponse.json({ error: 'Only organization owners can view license status' }, { status: 403 });
  }

  const status = await getLicenseStatus();

  return NextResponse.json({
    valid: status.valid,
    org: status.org,
    seats: status.seats,
    tier: status.tier,
    expiresAt: status.expiresAt?.toISOString(),
    daysRemaining: status.daysRemaining,
    expired: status.expired,
    source: status.source,
    error: status.error,
  });
}
