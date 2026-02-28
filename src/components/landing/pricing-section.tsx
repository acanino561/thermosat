'use client';

import { motion } from 'framer-motion';
import { useRef } from 'react';
import Link from 'next/link';

const plans = [
  {
    name: 'STARTER',
    price: '$2,000',
    period: '/year',
    desc: 'SmallSat startups & university teams',
    specs: [
      { key: 'PROJECTS', value: '5' },
      { key: 'SIMULATIONS', value: '50 / month' },
      { key: 'EXPORT', value: 'CSV, JSON' },
      { key: 'SUPPORT', value: 'Email' },
    ],
    cta: 'GET STARTED',
    href: '/signup',
    primary: false,
  },
  {
    name: 'PROFESSIONAL',
    price: '$5,000',
    period: '/year',
    desc: 'NewSpace engineers & growing teams',
    specs: [
      { key: 'PROJECTS', value: 'Unlimited' },
      { key: 'SIMULATIONS', value: 'Unlimited' },
      { key: 'EXPORT', value: 'All formats' },
      { key: 'CAD IMPORT', value: '3D models' },
      { key: 'V&V', value: 'Benchmark suite' },
      { key: 'SUPPORT', value: 'Priority' },
    ],
    cta: 'START FREE TRIAL',
    href: '/signup',
    primary: true,
  },
  {
    name: 'ENTERPRISE',
    price: 'CUSTOM',
    period: '',
    desc: 'Organizations & agencies',
    specs: [
      { key: 'EVERYTHING', value: 'In Professional +' },
      { key: 'DEPLOY', value: 'On-premise option' },
      { key: 'API', value: 'Full access' },
      { key: 'SUPPORT', value: 'Dedicated engineer' },
    ],
    cta: 'CONTACT SALES',
    href: 'mailto:sales@verixos.app',
    primary: false,
  },
];

export function PricingSection() {
  const sectionRef = useRef<HTMLElement>(null);

  return (
    <section
      id="pricing"
      ref={sectionRef}
      className="relative py-24 lg:py-32 px-6 lg:px-10"
      style={{ borderTop: '1px solid var(--tc-border)' }}
    >
      <div className="max-w-[1400px] mx-auto">
        {/* Section header */}
        <div className="mb-6">
          <span className="data-label">SECTION 04</span>
        </div>
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-16">
          <h2 className="font-mono font-bold text-display-lg tracking-tight" style={{ color: 'var(--tc-text)' }}>
            Pricing
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

        {/* Pricing cards — styled like equipment spec sheets */}
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
              {/* Plan header */}
              <div className="flex items-baseline justify-between mb-6">
                <span className="data-label">{plan.name}</span>
                {plan.primary && (
                  <span className="font-mono text-[9px] tracking-[0.15em] px-2 py-0.5 text-accent"
                    style={{ border: '1px solid var(--tc-accent)' }}
                  >
                    RECOMMENDED
                  </span>
                )}
              </div>

              {/* Price */}
              <div className="mb-2">
                <span className="font-mono text-4xl font-bold" style={{ color: plan.primary ? 'var(--tc-accent)' : 'var(--tc-text)' }}>
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

              {/* Spec rows */}
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

              {/* CTA */}
              <Link
                href="/signup"
                className="block mt-6 font-mono text-[11px] tracking-[0.15em] py-3 text-center transition-all duration-200"
                style={{
                  backgroundColor: plan.primary ? 'var(--tc-accent)' : 'transparent',
                  color: plan.primary ? '#fff' : 'var(--tc-text-secondary)',
                  border: plan.primary ? 'none' : '1px solid var(--tc-border)',
                }}
                onMouseEnter={(e) => {
                  if (plan.primary) {
                    e.currentTarget.style.boxShadow = '0 0 30px rgba(var(--tc-accent-rgb), 0.3)';
                  } else {
                    e.currentTarget.style.borderColor = 'var(--tc-accent)';
                    e.currentTarget.style.color = 'var(--tc-accent)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (plan.primary) {
                    e.currentTarget.style.boxShadow = 'none';
                  } else {
                    e.currentTarget.style.borderColor = 'var(--tc-border)';
                    e.currentTarget.style.color = 'var(--tc-text-secondary)';
                  }
                }}
              >
                {plan.cta} →
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
