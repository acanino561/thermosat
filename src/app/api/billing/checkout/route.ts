import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { getStripe, getPriceId } from '@/lib/billing/stripe';
import { db } from '@/lib/db/client';
import { subscriptions, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [user] = await db.select().from(users).where(eq(users.email, session.user.email));
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const body = await req.json();
  const { tier, orgId } = body as { tier: string; orgId?: string };

  if (!['starter', 'pro'].includes(tier)) {
    return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
  }

  const stripe = getStripe();
  const priceId = getPriceId(tier as 'starter' | 'pro');

  // Check existing subscription for customer ID
  const existingSubs = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, user.id));

  let customerId = existingSubs.find((s) => s.stripeCustomerId)?.stripeCustomerId;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { userId: user.id, ...(orgId ? { orgId } : {}) },
    });
    customerId = customer.id;
  }

  const lineItems: { price: string; quantity?: number }[] = [
    { price: priceId },
    { price: getPriceId('overage') },
  ];

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: lineItems,
    success_url: `${process.env.NEXTAUTH_URL}/dashboard/settings/billing?success=true`,
    cancel_url: `${process.env.NEXTAUTH_URL}/dashboard/settings/billing?cancelled=true`,
    metadata: {
      userId: user.id,
      tier,
      ...(orgId ? { orgId } : {}),
    },
  });

  return NextResponse.json({ url: checkoutSession.url });
}
