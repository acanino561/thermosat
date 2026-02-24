'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'For students and personal projects',
    features: [
      '3 projects',
      '10 nodes per model',
      'Steady-state analysis',
      'Basic material library',
      'Community support',
    ],
    cta: 'Get Started',
    variant: 'outline' as const,
    popular: false,
  },
  {
    name: 'Pro',
    price: '$49',
    period: '/month',
    description: 'For professional thermal engineers',
    features: [
      'Unlimited projects',
      'Unlimited nodes',
      'Transient & steady-state',
      'Full material library + custom',
      'Orbital environment engine',
      'API access',
      'CSV/JSON export',
      'Priority support',
    ],
    cta: 'Start Free Trial',
    variant: 'glow' as const,
    popular: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For teams and organizations',
    features: [
      'Everything in Pro',
      'Team collaboration',
      'SSO/SAML authentication',
      'Custom material databases',
      'Dedicated compute',
      'On-premise option',
      'SLA guarantee',
      'Dedicated support engineer',
    ],
    cta: 'Contact Sales',
    variant: 'outline' as const,
    popular: false,
  },
];

export function PricingSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section id="pricing" className="relative py-32 px-4" ref={ref}>
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="font-heading text-4xl md:text-5xl font-bold">
            Simple, transparent{' '}
            <span className="text-gradient">pricing</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            No seat licenses. No maintenance fees. Pay only for what you need.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.2 + i * 0.1, duration: 0.5 }}
              className={cn(
                'relative glass rounded-2xl p-8 transition-all duration-300 hover:scale-[1.02]',
                plan.popular && 'border-accent-blue/50 glow-blue scale-[1.02]',
              )}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2" variant="blue">
                  Most Popular
                </Badge>
              )}
              <div className="mb-6">
                <h3 className="font-heading text-2xl font-bold">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
              </div>
              <div className="mb-8">
                <span className="font-heading text-5xl font-bold">{plan.price}</span>
                <span className="text-muted-foreground ml-1">{plan.period}</span>
              </div>
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-sm">
                    <Check className="h-4 w-4 text-accent-cyan shrink-0" />
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                variant={plan.variant}
                className="w-full"
                size="lg"
                asChild
              >
                <Link href="/signup">{plan.cta}</Link>
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
