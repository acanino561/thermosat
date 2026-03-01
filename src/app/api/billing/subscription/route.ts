import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { db } from '@/lib/db/client';
import { subscriptions, users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getLimitsForTier } from '@/lib/billing/limits';

type Tier = 'free' | 'academic' | 'starter' | 'pro' | 'team' | 'enterprise';

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [user] = await db.select().from(users).where(eq(users.email, session.user.email));
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.userId, user.id), eq(subscriptions.status, 'active')));

  const tier = (sub?.tier ?? 'free') as Tier;
  const limits = getLimitsForTier(tier);

  return NextResponse.json({
    tier,
    status: sub?.status ?? 'active',
    currentPeriodEnd: sub?.currentPeriodEnd ?? null,
    seatCount: sub?.seatCount ?? 1,
    limits,
  });
}
