import Stripe from 'stripe';

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
    _stripe = new Stripe(key, { apiVersion: '2026-02-25.clover' });
  }
  return _stripe;
}

type Tier = 'starter' | 'pro' | 'overage';

const PRICE_ENV_MAP: Record<Tier, string> = {
  starter: 'STRIPE_PRICE_STARTER_ANNUAL',
  pro: 'STRIPE_PRICE_PRO_ANNUAL',
  overage: 'STRIPE_PRICE_SIM_OVERAGE',
};

export function getPriceId(tier: Tier): string {
  const envVar = PRICE_ENV_MAP[tier];
  const priceId = process.env[envVar];
  if (!priceId) throw new Error(`${envVar} is not set`);
  return priceId;
}

export async function reportSimulationUsage(
  stripeCustomerId: string,
  quantity: number,
): Promise<void> {
  const stripe = getStripe();
  // Stripe 2026 API uses billing.meterEvents for metered usage reporting.
  // stripeCustomerId must be a cus_xxx ID for meter event correlation.
  await stripe.billing.meterEvents.create({
    event_name: 'simulation_run',
    payload: {
      stripe_customer_id: stripeCustomerId,
      value: String(quantity),
    },
  });
}

export const SIM_RUN_LIMITS: Record<'academic' | 'starter' | 'pro', number> = {
  academic: 20,
  starter: 50,
  pro: 200,
};
