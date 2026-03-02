import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'Verixos pricing plans for spacecraft thermal analysis.',
};

const tiers = [
  {
    name: 'Academic',
    price: 'Free',
    period: '',
    description: 'For students and academic research. Requires .edu email or manual review.',
    features: [
      '1 user',
      'Up to 25 thermal nodes',
      '1 active model',
      'All physics solvers',
      'TFAWS-standard benchmarks',
      'No API access',
    ],
    cta: 'Apply for Access',
    href: 'mailto:hello@verixos.com?subject=Academic Access Request',
    highlighted: false,
  },
  {
    name: 'Starter',
    price: '$2,000',
    period: '/year',
    description: 'For university groups and startup missions getting started with thermal analysis.',
    features: [
      '1 user',
      '10 projects',
      'RK4 + Implicit Euler solver',
      'CSV & JSON export',
      'Email support',
      'Standard material library',
    ],
    cta: 'Get Started',
    href: '/login',
    highlighted: false,
  },
  {
    name: 'Professional',
    price: '$5,000',
    period: '/year',
    description: 'For engineering teams who need unlimited capability and V&V benchmarks.',
    features: [
      '5 users',
      'Unlimited projects',
      'All export formats (CSV, JSON, PDF)',
      'Orbit playback with shadow mapping',
      'What If instant replay',
      'V&V benchmark suite',
      'Priority support',
      'Full material database',
    ],
    cta: 'Start Free Trial',
    href: '/login',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For prime contractors and agencies requiring dedicated infrastructure and support.',
    features: [
      'Everything in Professional',
      'Unlimited users',
      'On-premise deployment option',
      'Full API access & SDKs',
      'Dedicated support engineer',
      'SSO / SAML authentication',
      'Custom SLA',
    ],
    cta: 'Contact Sales',
    href: 'mailto:sales@verixos.app',
    highlighted: false,
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen py-24 px-6 lg:px-10" style={{ backgroundColor: 'var(--tc-base)' }}>
      <div className="max-w-[1200px] mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h1
            className="font-mono font-bold text-4xl lg:text-5xl tracking-tight mb-4"
            style={{ color: 'var(--tc-text)' }}
          >
            Pricing
          </h1>
          <p
            className="text-base max-w-lg mx-auto leading-relaxed font-sans"
            style={{ color: 'var(--tc-text-secondary)' }}
          >
            One order of magnitude cheaper than legacy thermal analysis tools.
            No seat licenses. No hidden costs.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px" style={{ backgroundColor: 'var(--tc-border)' }}>
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className="p-8 flex flex-col"
              style={{
                backgroundColor: tier.highlighted ? 'var(--tc-elevated)' : 'var(--tc-surface)',
              }}
            >
              {/* Tier header */}
              <div className="flex items-baseline justify-between mb-6">
                <span className="font-mono text-[10px] tracking-[0.2em] uppercase" style={{ color: 'var(--tc-text-muted)' }}>
                  {tier.name}
                </span>
                {tier.highlighted && (
                  <span
                    className="font-mono text-[9px] tracking-[0.15em] px-2 py-0.5 text-accent"
                    style={{ border: '1px solid var(--tc-accent)' }}
                  >
                    RECOMMENDED
                  </span>
                )}
              </div>

              {/* Price */}
              <div className="mb-2">
                <span
                  className="font-mono text-4xl font-bold"
                  style={{ color: tier.highlighted ? 'var(--tc-accent)' : 'var(--tc-text)' }}
                >
                  {tier.price}
                </span>
                {tier.period && (
                  <span className="font-mono text-xs ml-1" style={{ color: 'var(--tc-text-muted)' }}>
                    {tier.period}
                  </span>
                )}
              </div>
              <p className="text-sm font-sans mb-6" style={{ color: 'var(--tc-text-secondary)' }}>
                {tier.description}
              </p>

              {/* Features */}
              <div className="flex-1" style={{ borderTop: '1px solid var(--tc-border)' }}>
                {tier.features.map((feature) => (
                  <div
                    key={feature}
                    className="flex items-center gap-2 py-2.5 font-mono text-xs"
                    style={{ borderBottom: '1px solid var(--tc-border-subtle)' }}
                  >
                    <span className="text-accent">▸</span>
                    <span style={{ color: 'var(--tc-text-secondary)' }}>{feature}</span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <Link
                href={tier.href}
                className="block mt-6 font-mono text-[11px] tracking-[0.15em] py-3 text-center transition-all duration-200"
                style={{
                  backgroundColor: tier.highlighted ? 'var(--tc-accent)' : 'transparent',
                  color: tier.highlighted ? '#fff' : 'var(--tc-text-secondary)',
                  border: tier.highlighted ? 'none' : '1px solid var(--tc-border)',
                }}
              >
                {tier.cta} →
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
