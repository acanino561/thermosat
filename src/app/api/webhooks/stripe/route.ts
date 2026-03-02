import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripe } from '@/lib/billing/stripe';
import { db } from '@/lib/db/client';
import { subscriptions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

async function getSubscriptionPeriodEnd(subscriptionId: string): Promise<Date | null> {
  try {
    const stripe = getStripe();
    const sub = await stripe.subscriptions.retrieve(subscriptionId);
    return new Date((sub as unknown as { current_period_end: number }).current_period_end * 1000);
  } catch {
    return null;
  }
}

function extractId(value: string | { id: string } | null | undefined): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  return value.id;
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: `Webhook verification failed: ${message}` }, { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const rawTier = session.metadata?.tier;
      const tier = rawTier === 'team' ? 'pro' : rawTier;
      const orgId = session.metadata?.orgId;
      const customerId = extractId(session.customer as string | null);
      const subscriptionId = extractId(session.subscription as string | null);

      if (!userId || !tier) break;

      let periodEnd: Date | null = null;
      if (subscriptionId) {
        periodEnd = await getSubscriptionPeriodEnd(subscriptionId);
      }

      await db.insert(subscriptions).values({
        userId: orgId ? undefined : userId,
        orgId: orgId ?? undefined,
        tier: tier as 'starter' | 'pro',
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        status: 'active',
        currentPeriodEnd: periodEnd,
      }).onConflictDoUpdate({
        target: subscriptions.stripeSubscriptionId,
        set: {
          tier: tier as 'starter' | 'pro',
          status: 'active',
          currentPeriodEnd: periodEnd,
          updatedAt: new Date(),
        },
      });
      break;
    }

    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = extractId(invoice.customer as string | null);
      if (!customerId) break;

      const subscriptionId = extractId((invoice as unknown as { subscription: string | null }).subscription);
      let periodEnd: Date | null = null;
      if (subscriptionId) {
        periodEnd = await getSubscriptionPeriodEnd(subscriptionId);
      }

      await db
        .update(subscriptions)
        .set({
          status: 'active',
          currentPeriodEnd: periodEnd,
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.stripeCustomerId, customerId));
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = extractId(invoice.customer as string | null);
      if (!customerId) break;

      await db
        .update(subscriptions)
        .set({ status: 'past_due', updatedAt: new Date() })
        .where(eq(subscriptions.stripeCustomerId, customerId));
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = extractId(sub.customer as string | null);
      if (!customerId) break;

      await db
        .update(subscriptions)
        .set({ tier: 'free', status: 'cancelled', updatedAt: new Date() })
        .where(eq(subscriptions.stripeCustomerId, customerId));
      break;
    }
  }

  return NextResponse.json({ received: true });
}
