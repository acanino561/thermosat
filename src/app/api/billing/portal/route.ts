import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { getStripe } from '@/lib/billing/stripe';
import { db } from '@/lib/db/client';
import { subscriptions, users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(_req: NextRequest) {
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

  if (!sub?.stripeCustomerId) {
    return NextResponse.json({ error: 'No active subscription found' }, { status: 404 });
  }

  if (sub.tier === 'enterprise') {
    return NextResponse.json({ error: 'Enterprise plans are managed by your account team' }, { status: 400 });
  }

  const stripe = getStripe();
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: `${process.env.NEXTAUTH_URL}/dashboard/settings/billing`,
  });

  return NextResponse.json({ url: portalSession.url });
}
