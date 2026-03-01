import { db } from '@/lib/db/client';
import { subscriptions } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export interface TierLimits {
  maxNodes: number;
  maxSimultaneousSims: number;
  advisorCallsPerMonth: number;
}

type Tier = 'free' | 'academic' | 'starter' | 'pro' | 'team' | 'enterprise';

const TIER_LIMITS: Record<Tier, TierLimits> = {
  free:       { maxNodes: 50,   maxSimultaneousSims: 1,  advisorCallsPerMonth: 5  },
  academic:   { maxNodes: 200,  maxSimultaneousSims: 2,  advisorCallsPerMonth: 20 },
  starter:    { maxNodes: 500,  maxSimultaneousSims: 3,  advisorCallsPerMonth: -1 },
  pro:        { maxNodes: 2000, maxSimultaneousSims: 10, advisorCallsPerMonth: -1 },
  team:       { maxNodes: 5000, maxSimultaneousSims: 25, advisorCallsPerMonth: -1 },
  enterprise: { maxNodes: -1,   maxSimultaneousSims: -1, advisorCallsPerMonth: -1 },
};

export function getLimitsForTier(tier: Tier): TierLimits {
  return TIER_LIMITS[tier] ?? TIER_LIMITS.free;
}

/**
 * Get the effective subscription for a user (checks personal sub first, then org subs).
 */
export async function getUserSubscription(userId: string) {
  // Check personal subscription
  const [personal] = await db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, 'active')));

  if (personal) return personal;

  // No personal sub — return null (caller can check org separately)
  return null;
}

export async function getUserTier(userId: string): Promise<Tier> {
  const sub = await getUserSubscription(userId);
  return (sub?.tier as Tier) ?? 'free';
}

export async function getUserTierLimits(userId: string): Promise<TierLimits> {
  const tier = await getUserTier(userId);
  return getLimitsForTier(tier);
}

const RESOURCE_MAP = {
  nodes: 'maxNodes',
  sims: 'maxSimultaneousSims',
  advisor: 'advisorCallsPerMonth',
} as const;

export async function enforceTierLimit(
  userId: string,
  resource: 'nodes' | 'sims' | 'advisor',
  currentCount?: number,
): Promise<void> {
  const limits = await getUserTierLimits(userId);
  const limitKey = RESOURCE_MAP[resource];
  const limit = limits[limitKey];

  // -1 means unlimited
  if (limit === -1) return;

  if (currentCount !== undefined && currentCount >= limit) {
    const error = {
      code: 'TIER_LIMIT_EXCEEDED' as const,
      message: `You have reached the ${resource} limit for your plan.`,
      upgradeUrl: '/dashboard/settings/billing',
    };
    throw new TierLimitError(error);
  }
}

export class TierLimitError extends Error {
  public readonly statusCode = 403;
  public readonly code = 'TIER_LIMIT_EXCEEDED';
  public readonly upgradeUrl = '/dashboard/settings/billing';

  constructor(details: { code: string; message: string; upgradeUrl: string }) {
    super(details.message);
    this.name = 'TierLimitError';
  }
}
