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

type Tier = 'starter' | 'pro' | 'team';

const PRICE_ENV_MAP: Record<Tier, string> = {
  starter: 'STRIPE_PRICE_STARTER_ANNUAL',
  pro: 'STRIPE_PRICE_PRO_ANNUAL',
  team: 'STRIPE_PRICE_TEAM_SEAT_ANNUAL',
};

export function getPriceId(tier: Tier): string {
  const envVar = PRICE_ENV_MAP[tier];
  const priceId = process.env[envVar];
  if (!priceId) throw new Error(`${envVar} is not set`);
  return priceId;
}
