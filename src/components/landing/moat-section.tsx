'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

/* ── Custom SVG icons — no external library ──────────────────────────── */

function IconProvenance() {
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" fill="none" aria-hidden>
      {/* Central node */}
      <circle cx="36" cy="36" r="5" stroke="currentColor" strokeWidth="1.5" />
      {/* Branch lines */}
      <line x1="36" y1="31" x2="36" y2="14" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2" />
      <line x1="36" y1="41" x2="20" y2="58" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2" />
      <line x1="36" y1="41" x2="52" y2="58" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2" />
      {/* Child nodes */}
      <circle cx="36" cy="11" r="3.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="17" cy="61" r="3.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="55" cy="61" r="3.5" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.5" />
      {/* Tag on top node — version label */}
      <rect x="41" y="6" width="18" height="10" rx="2" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      <line x1="41" y1="11" x2="44.5" y2="11" stroke="currentColor" strokeWidth="1" opacity="0.5" />
    </svg>
  );
}

function IconDeliverable() {
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" fill="none" aria-hidden>
      {/* Document body */}
      <rect x="14" y="8" width="38" height="50" rx="3" stroke="currentColor" strokeWidth="1.5" />
      {/* Folded corner */}
      <path d="M40 8 L52 20" stroke="currentColor" strokeWidth="1.5" />
      <path d="M40 8 L40 20 L52 20" stroke="currentColor" strokeWidth="1" opacity="0.4" />
      {/* Content lines */}
      <line x1="22" y1="30" x2="44" y2="30" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
      <line x1="22" y1="38" x2="44" y2="38" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
      <line x1="22" y1="46" x2="36" y2="46" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
      {/* Checkmark badge */}
      <circle cx="50" cy="56" r="11" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeWidth="1.5" />
      <polyline points="44,56 48,60 56,52" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconCICD() {
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" fill="none" aria-hidden>
      {/* Pipeline boxes */}
      <rect x="4" y="29" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <rect x="28" y="29" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <rect x="52" y="29" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
      {/* Connectors */}
      <line x1="20" y1="36" x2="28" y2="36" stroke="currentColor" strokeWidth="1.5" />
      <polyline points="25,32 28,36 25,40" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="44" y1="36" x2="52" y2="36" stroke="currentColor" strokeWidth="1.5" />
      <polyline points="49,32 52,36 49,40" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Green check on last box */}
      <polyline points="57,36 60,39 67,32" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* Status dot above first box */}
      <circle cx="12" cy="24" r="3" fill="currentColor" fillOpacity="0.3" stroke="currentColor" strokeWidth="1" />
      {/* Branch line going up to commit */}
      <line x1="12" y1="29" x2="12" y2="27" stroke="currentColor" strokeWidth="1" opacity="0.5" />
    </svg>
  );
}

function IconKnowledge() {
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" fill="none" aria-hidden>
      {/* Central hub */}
      <circle cx="36" cy="36" r="7" stroke="currentColor" strokeWidth="1.5" />
      {/* Spoke nodes */}
      <circle cx="36" cy="12" r="5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="60" cy="28" r="5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="60" cy="52" r="5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="36" cy="60" r="5" stroke="currentColor" strokeWidth="1.5" fillOpacity="0.15" fill="currentColor" />
      <circle cx="12" cy="52" r="5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="28" r="5" stroke="currentColor" strokeWidth="1.5" />
      {/* Spoke lines */}
      <line x1="36" y1="17" x2="36" y2="29" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      <line x1="55.3" y1="30.7" x2="41.2" y2="32.8" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      <line x1="55.3" y1="49.3" x2="41.2" y2="39.2" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      <line x1="36" y1="55" x2="36" y2="43" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      <line x1="16.7" y1="49.3" x2="30.8" y2="39.2" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      <line x1="16.7" y1="30.7" x2="30.8" y2="32.8" stroke="currentColor" strokeWidth="1" opacity="0.5" />
    </svg>
  );
}

function IconNextGen() {
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" fill="none" aria-hidden>
      {/* Orbital arc */}
      <path d="M8 56 Q36 4 64 28" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 2" opacity="0.4" />
      {/* Satellite at end of arc — small CubeSat shape */}
      <rect x="58" y="22" width="10" height="8" rx="1" stroke="currentColor" strokeWidth="1.5" />
      {/* Solar panels */}
      <rect x="50" y="24" width="8" height="4" rx="1" stroke="currentColor" strokeWidth="1" opacity="0.6" />
      <rect x="68" y="24" width="8" height="4" rx="1" stroke="currentColor" strokeWidth="1" opacity="0.6" />
      {/* Cap / graduation hat metaphor — person at start of arc */}
      <circle cx="11" cy="53" r="5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 53 Q11 46 16 53" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      {/* Upward arrow below arc */}
      <line x1="36" y1="52" x2="36" y2="62" stroke="currentColor" strokeWidth="1" opacity="0.3" strokeDasharray="2 2" />
    </svg>
  );
}

const ICONS = [IconProvenance, IconDeliverable, IconCICD, IconKnowledge, IconNextGen];

/* ── Data ─────────────────────────────────────────────────── */

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

/* ── Item component ───────────────────────────────────────── */

function MoatItem({ item, index }: { item: typeof items[number]; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.25 });

  const isLeft = item.side === 'left';
  const xFrom = isLeft ? -48 : 48;
  const Icon = ICONS[index];

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: xFrom }}
      animate={isInView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="relative py-12 lg:py-16"
      style={{ borderBottom: '1px solid var(--tc-border)' }}
    >
      <div className={`flex items-center gap-8 lg:gap-0 ${isLeft ? '' : 'flex-row-reverse'}`}>

        {/* Content block — ~45% width on desktop */}
        <div className={`w-full lg:w-[45%] ${isLeft ? 'lg:pr-12' : 'lg:pl-12'}`}>
          {/* Number + title */}
          <div className="flex items-baseline gap-4 mb-4">
            <span
              className="font-mono font-bold shrink-0"
              style={{ color: 'var(--tc-accent)', fontSize: 'clamp(1.25rem, 2.5vw, 1.75rem)', opacity: 0.6 }}
            >
              {item.num}
            </span>
            <h3
              className="font-mono font-bold tracking-[0.06em] leading-tight"
              style={{ color: 'var(--tc-text)', fontSize: 'clamp(1rem, 1.8vw, 1.25rem)' }}
            >
              {item.title}
            </h3>
          </div>

          <p
            className="text-sm leading-relaxed font-sans"
            style={{ color: 'var(--tc-text-secondary)' }}
          >
            {item.body}
          </p>
        </div>

        {/* Icon occupies the negative-space side — desktop only */}
        <div
          className={`hidden lg:flex flex-1 items-center ${isLeft ? 'justify-end' : 'justify-start'}`}
          style={{ color: 'var(--tc-accent)', opacity: 0.25 }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.2, ease: 'easeOut' }}
          >
            <Icon />
          </motion.div>
        </div>

      </div>
    </motion.div>
  );
}

/* ── Section ──────────────────────────────────────────────── */

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
        {/* Section header */}
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

        {/* Staggered items */}
        <div>
          {items.map((item, i) => (
            <MoatItem key={item.num} item={item} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
