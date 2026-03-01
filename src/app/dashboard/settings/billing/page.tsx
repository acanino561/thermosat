'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { CreditCard, ExternalLink, GraduationCap, Loader2, Rocket, Check } from 'lucide-react';
import { useSession } from 'next-auth/react';

interface SubscriptionData {
  tier: string;
  status: string;
  currentPeriodEnd: string | null;
  seatCount: number;
  limits: {
    maxNodes: number;
    maxSimultaneousSims: number;
    advisorCallsPerMonth: number;
  };
}

const TIER_DISPLAY: Record<string, { label: string; color: string }> = {
  free: { label: 'Free', color: 'bg-gray-500' },
  academic: { label: 'Academic', color: 'bg-blue-500' },
  starter: { label: 'Starter', color: 'bg-green-500' },
  pro: { label: 'Pro', color: 'bg-purple-500' },
  team: { label: 'Team', color: 'bg-orange-500' },
  enterprise: { label: 'Enterprise', color: 'bg-red-500' },
};

const UPGRADE_TIERS = [
  {
    id: 'starter',
    name: 'Starter',
    price: '$2,000/yr',
    features: ['500 nodes', '3 simultaneous sims', 'Unlimited advisor calls'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$5,000/yr',
    features: ['2,000 nodes', '10 simultaneous sims', 'Unlimited advisor calls'],
  },
  {
    id: 'team',
    name: 'Team',
    price: '$4,000/seat/yr',
    features: ['5,000 nodes', '25 simultaneous sims', 'Unlimited advisor calls', 'Organization billing'],
  },
];

export default function BillingPage() {
  const { data: session } = useSession();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [academicLoading, setAcademicLoading] = useState(false);

  const isEduEmail = session?.user?.email?.endsWith('.edu') ?? false;

  useEffect(() => {
    fetch('/api/billing/subscription')
      .then((r) => r.json())
      .then(setSubscription)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleCheckout(tier: string) {
    setCheckoutLoading(tier);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Checkout error:', err);
    } finally {
      setCheckoutLoading(null);
    }
  }

  async function handlePortal() {
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Portal error:', err);
    }
  }

  async function handleAcademic() {
    setAcademicLoading(true);
    try {
      const res = await fetch('/api/billing/academic', { method: 'POST' });
      if (res.ok) {
        // Refresh subscription data
        const subRes = await fetch('/api/billing/subscription');
        setSubscription(await subRes.json());
      }
    } catch (err) {
      console.error('Academic error:', err);
    } finally {
      setAcademicLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const tier = subscription?.tier ?? 'free';
  const display = TIER_DISPLAY[tier] ?? TIER_DISPLAY.free;
  const limits = subscription?.limits;

  function formatLimit(val: number) {
    return val === -1 ? 'Unlimited' : val.toLocaleString();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold tracking-tight">Billing & Plan</h1>
        <p className="text-muted-foreground">Manage your subscription and usage limits.</p>
      </motion.div>

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Current Plan
          </CardTitle>
          <CardDescription>Your active subscription and usage limits.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Badge className={display.color}>{display.label}</Badge>
            {subscription?.status === 'past_due' && (
              <Badge variant="destructive">Payment Past Due</Badge>
            )}
          </div>

          {subscription?.currentPeriodEnd && (
            <p className="text-sm text-muted-foreground">
              Current period ends: {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
            </p>
          )}

          {limits && (
            <div className="grid grid-cols-3 gap-4 pt-2">
              <div>
                <p className="text-sm font-medium">Max Nodes</p>
                <p className="text-2xl font-bold">{formatLimit(limits.maxNodes)}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Simultaneous Sims</p>
                <p className="text-2xl font-bold">{formatLimit(limits.maxSimultaneousSims)}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Advisor Calls/Month</p>
                <p className="text-2xl font-bold">{formatLimit(limits.advisorCallsPerMonth)}</p>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            {tier !== 'enterprise' && (
              <>
                <Dialog open={upgradeOpen} onOpenChange={setUpgradeOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Rocket className="mr-2 h-4 w-4" />
                      Upgrade Plan
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl">
                    <DialogHeader>
                      <DialogTitle>Choose a Plan</DialogTitle>
                      <DialogDescription>
                        Select the plan that fits your thermal analysis needs.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-3 gap-4 py-4">
                      {UPGRADE_TIERS.map((t) => (
                        <Card key={t.id} className="relative">
                          <CardHeader>
                            <CardTitle>{t.name}</CardTitle>
                            <CardDescription>{t.price}</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <ul className="space-y-2 text-sm">
                              {t.features.map((f) => (
                                <li key={f} className="flex items-center gap-2">
                                  <Check className="h-4 w-4 text-green-500" />
                                  {f}
                                </li>
                              ))}
                            </ul>
                            <Button
                              className="mt-4 w-full"
                              onClick={() => handleCheckout(t.id)}
                              disabled={checkoutLoading !== null || tier === t.id}
                            >
                              {checkoutLoading === t.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : tier === t.id ? (
                                'Current Plan'
                              ) : (
                                'Select'
                              )}
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                    <div className="text-center text-sm text-muted-foreground">
                      Need more?{' '}
                      <a href="mailto:sales@verixos.com" className="underline">
                        Contact Sales
                      </a>{' '}
                      for Enterprise pricing.
                    </div>
                  </DialogContent>
                </Dialog>

                {tier !== 'free' && tier !== 'academic' && (
                  <Button variant="outline" onClick={handlePortal}>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Billing Portal
                  </Button>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Academic Plan */}
      {isEduEmail && tier === 'free' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Academic Plan
            </CardTitle>
            <CardDescription>
              Your email qualifies for our free Academic plan with expanded limits.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleAcademic} disabled={academicLoading}>
              {academicLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <GraduationCap className="mr-2 h-4 w-4" />
              )}
              Apply Academic Plan
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
