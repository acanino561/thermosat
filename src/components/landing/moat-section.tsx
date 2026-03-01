'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const items = [
  {
    num: '01',
    title: 'COMPLETE MISSION PROVENANCE',
    body: 'Every simulation run, what-if study, and design review comment is stored with the model that produced it. Your current thermal design traces back to PDR baseline — searchable, version-controlled, and attributable. The full engineering record, not just the latest export.',
    side: 'left' as const,
  },
  {
    num: '02',
    title: 'DELIVERABLE-READY OUTPUT',
    body: 'Export thermal analysis citations for CDR packages with benchmark compliance reports auto-generated. Verixos version, benchmark results B1–B10, and model hash are included in every report — so your review board gets everything they need without extra work.',
    side: 'right' as const,
  },
  {
    num: '03',
    title: 'NATIVE CI/CD INTEGRATION',
    body: 'Run thermal margin checks on every commit. Connect Verixos to GitHub Actions, GitLab CI, or Jenkins — get a pass/fail badge before hardware is committed. Thermal analysis moves at the speed of your software pipeline, not your review calendar.',
    side: 'left' as const,
  },
  {
    num: '04',
    title: 'SHARED ENGINEERING KNOWLEDGE',
    body: 'Custom materials, flight-heritage optical properties, mission bus templates, and node libraries are shared across your organization. Junior engineers work from the same validated baselines as senior staff — institutional knowledge encoded into the platform, not locked in someone\'s head.',
    side: 'right' as const,
  },
  {
    num: '05',
    title: 'BUILT FOR THE NEXT GENERATION',
    body: 'The academic tier exists because the engineers who learn tools at university carry them into industry. Free access for students and researchers means Verixos is taught alongside the physics it simulates — the same way a generation of engineers learned MATLAB.',
    side: 'left' as const,
  },
];

function MoatItem({ item, index }: { item: typeof items[number]; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });

  const isLeft = item.side === 'left';
  const xFrom = isLeft ? -40 : 40;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: xFrom }}
      animate={isInView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
      className="relative py-10 lg:py-14"
      style={{ borderBottom: '1px solid var(--tc-border)' }}
    >
      {/* Full-width row — content pinned left or right */}
      <div
        className={`flex items-start gap-8 lg:gap-16 ${isLeft ? '' : 'flex-row-reverse'}`}
      >
        {/* Number — large accent, shrinks on mobile */}
        <div
          className="font-mono font-bold shrink-0 hidden sm:block"
          style={{
            color: 'var(--tc-accent)',
            fontSize: 'clamp(2.5rem, 5vw, 4.5rem)',
            lineHeight: 1,
            opacity: 0.5,
            width: '5rem',
            textAlign: isLeft ? 'left' : 'right',
          }}
        >
          {item.num}
        </div>

        {/* Content — takes up ~half the row width */}
        <div className="max-w-[520px]">
          {/* Mobile number */}
          <div
            className="font-mono font-bold sm:hidden mb-2"
            style={{ color: 'var(--tc-accent)', fontSize: '1.75rem', opacity: 0.5 }}
          >
            {item.num}
          </div>

          <div
            className="font-mono text-[11px] tracking-[0.2em] mb-3"
            style={{ color: 'var(--tc-text)' }}
          >
            {item.title}
          </div>

          <p
            className="text-sm leading-relaxed font-sans"
            style={{ color: 'var(--tc-text-secondary)' }}
          >
            {item.body}
          </p>
        </div>

        {/* Spacer — fills negative space on the empty side */}
        <div className="flex-1 hidden lg:block" />
      </div>
    </motion.div>
  );
}

export function MoatSection() {
  const headerRef = useRef<HTMLDivElement>(null);
  const headerInView = useInView(headerRef, { once: true, amount: 0.3 });

  return (
    <section
      className="relative py-24 lg:py-32 px-6 lg:px-10 overflow-hidden"
      style={{ borderTop: '1px solid var(--tc-border)' }}
    >
      <div className="absolute inset-0 eng-grid pointer-events-none opacity-10" aria-hidden />

      <div className="relative z-10 max-w-[1400px] mx-auto">
        {/* Header */}
        <motion.div
          ref={headerRef}
          initial={{ opacity: 0, y: 20 }}
          animate={headerInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="mb-16"
        >
          <div
            className="font-mono text-[10px] tracking-[0.2em] mb-6"
            style={{ color: 'var(--tc-text-muted)' }}
          >
            SECTION 06
          </div>

          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <h2 className="font-mono font-bold tracking-tight leading-[0.95]">
              <span className="block text-3xl lg:text-4xl" style={{ color: 'var(--tc-text)' }}>
                Built into
              </span>
              <span className="block text-3xl lg:text-4xl" style={{ color: 'var(--tc-accent)' }}>
                your program
              </span>
            </h2>

            <p
              className="lg:max-w-md text-sm leading-relaxed font-sans"
              style={{ color: 'var(--tc-text-secondary)' }}
            >
              Verixos becomes part of your engineering infrastructure — your models, your deliverables,
              your pipeline. The longer you run it, the more context it holds.
            </p>
          </div>

          <div className="rule-accent mt-8" style={{ maxWidth: 80 }} />
        </motion.div>

        {/* Staggered items — each animates independently on scroll */}
        <div>
          {items.map((item, i) => (
            <MoatItem key={item.num} item={item} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
