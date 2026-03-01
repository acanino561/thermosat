'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

const plans = [
  {
    name: 'STARTER',
    price: '$2,000',
    period: '/year',
    desc: 'For university groups and startup missions',
    specs: [
      { key: 'USERS', value: '1' },
      { key: 'PROJECTS', value: '10' },
      { key: 'SUPPORT', value: 'Email' },
    ],
    cta: 'GET STARTED',
    href: '/auth/signin',
    primary: false,
  },
  {
    name: 'PROFESSIONAL',
    price: '$5,000',
    period: '/year',
    desc: 'For engineering teams',
    specs: [
      { key: 'USERS', value: '5' },
      { key: 'PROJECTS', value: 'Unlimited' },
      { key: 'V&V', value: 'Benchmark suite' },
      { key: 'SUPPORT', value: 'Priority' },
    ],
    cta: 'START FREE TRIAL',
    href: '/auth/signin',
    primary: true,
  },
  {
    name: 'ENTERPRISE',
    price: 'CUSTOM',
    period: '',
    desc: 'For prime contractors and agencies',
    specs: [
      { key: 'USERS', value: 'Unlimited' },
      { key: 'DEPLOY', value: 'On-prem option' },
      { key: 'API', value: 'Full access' },
      { key: 'SUPPORT', value: 'Dedicated engineer' },
    ],
    cta: 'CONTACT SALES',
    href: 'mailto:sales@verixos.app',
    primary: false,
  },
];

export function PricingSection() {
  return (
    <section
      id="pricing"
      className="relative py-24 lg:py-32 px-6 lg:px-10"
      style={{ borderTop: '1px solid var(--tc-border)' }}
    >
      <div className="max-w-[1400px] mx-auto">
        <div className="mb-6">
          <span className="data-label">PRICING</span>
        </div>
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-16">
          <h2 className="font-mono font-bold text-display-lg tracking-tight" style={{ color: 'var(--tc-text)' }}>
            Simple<br />
            <span className="text-accent">pricing</span>
          </h2>
          <p
            className="max-w-md text-sm leading-relaxed font-sans lg:text-right"
            style={{ color: 'var(--tc-text-secondary)' }}
          >
            No seat licenses. No maintenance fees. No hidden costs.
            <br />
            One order of magnitude cheaper than legacy tools.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-px" style={{ backgroundColor: 'var(--tc-border)' }}>
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              className="p-6 lg:p-8 flex flex-col"
              style={{
                backgroundColor: plan.primary ? 'var(--tc-elevated)' : 'var(--tc-surface)',
              }}
            >
              <div className="flex items-baseline justify-between mb-6">
                <span className="data-label">{plan.name}</span>
                {plan.primary && (
                  <span
                    className="font-mono text-[9px] tracking-[0.15em] px-2 py-0.5 text-accent"
                    style={{ border: '1px solid var(--tc-accent)' }}
                  >
                    RECOMMENDED
                  </span>
                )}
              </div>

              <div className="mb-2">
                <span
                  className="font-mono text-4xl font-bold"
                  style={{ color: plan.primary ? 'var(--tc-accent)' : 'var(--tc-text)' }}
                >
                  {plan.price}
                </span>
                {plan.period && (
                  <span className="font-mono text-xs ml-1" style={{ color: 'var(--tc-text-muted)' }}>
                    {plan.period}
                  </span>
                )}
              </div>
              <p className="text-sm font-sans mb-6" style={{ color: 'var(--tc-text-secondary)' }}>
                {plan.desc}
              </p>

              <div className="flex-1" style={{ borderTop: '1px solid var(--tc-border)' }}>
                {plan.specs.map((spec) => (
                  <div
                    key={spec.key}
                    className="flex items-baseline justify-between py-2.5 font-mono text-xs"
                    style={{ borderBottom: '1px solid var(--tc-border-subtle)' }}
                  >
                    <span style={{ color: 'var(--tc-text-muted)' }}>{spec.key}</span>
                    <span style={{ color: 'var(--tc-text-secondary)' }}>{spec.value}</span>
                  </div>
                ))}
              </div>

              <Link
                href={plan.href}
                className="block mt-6 font-mono text-[11px] tracking-[0.15em] py-3 text-center transition-all duration-200"
                style={{
                  backgroundColor: plan.primary ? 'var(--tc-accent)' : 'transparent',
                  color: plan.primary ? '#fff' : 'var(--tc-text-secondary)',
                  border: plan.primary ? 'none' : '1px solid var(--tc-border)',
                }}
              >
                {plan.cta} →
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/pricing"
            className="font-mono text-xs tracking-[0.15em] transition-colors duration-200 hover:text-accent"
            style={{ color: 'var(--tc-text-muted)' }}
          >
            SEE FULL PRICING →
          </Link>
        </div>
      </div>
    </section>
  );
}
