'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

const benchmarkTags = [
  'B1 Two-node conduction',
  'B2 Radiation equilibrium',
  'B3 ISS orbital env',
  'B4 Multi-node networks',
  'B5 Transient response',
  'B6 Heat pipe conductors',
  'B7 Monte Carlo VF',
  'B8 Composite walls',
  'B9 Phase change',
  'B10 Full orbit transient',
];

export function VvBadgeSection() {
  const stripRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: stripRef,
    offset: ['start end', 'end start'],
  });
  const x = useTransform(scrollYProgress, [0, 1], [40, -40]);

  return (
    <div
      ref={stripRef}
      className="relative overflow-hidden py-5"
      style={{
        borderTop: '1px solid var(--tc-border)',
        borderBottom: '1px solid var(--tc-border)',
        backgroundColor: 'var(--tc-surface)',
      }}
    >
      <motion.div
        style={{ x }}
        className="flex items-center gap-6 lg:gap-8 px-6 lg:px-10 min-w-max"
      >
        {/* V&V label */}
        <span
          className="font-mono text-[10px] tracking-[0.15em] font-bold shrink-0"
          style={{ color: 'var(--tc-accent)' }}
        >
          V&V
        </span>

        <span className="font-mono text-[10px]" style={{ color: 'var(--tc-text-muted)' }}>·</span>

        <span className="font-mono text-xs font-semibold shrink-0" style={{ color: 'var(--tc-text)' }}>
          10/10 BENCHMARKS PASSING
        </span>

        <span className="font-mono text-[10px]" style={{ color: 'var(--tc-text-muted)' }}>·</span>

        <span className="font-mono text-[10px] tracking-[0.1em] shrink-0" style={{ color: 'var(--tc-text-muted)' }}>
          B1–B10 ALL PASS
        </span>

        <span className="font-mono text-[10px]" style={{ color: 'var(--tc-text-muted)' }}>·</span>

        <span className="font-mono text-[10px] tracking-[0.1em] shrink-0" style={{ color: 'var(--tc-text-secondary)' }}>
          Validated: Incropera / NASA SP-8055 / ECSS-E-ST-31
        </span>

        <span className="font-mono text-[10px]" style={{ color: 'var(--tc-text-muted)' }}>·</span>

        {/* Benchmark tags */}
        {benchmarkTags.map((tag) => (
          <span
            key={tag}
            className="font-mono text-[9px] tracking-[0.1em] px-2 py-0.5 shrink-0"
            style={{
              color: 'var(--tc-text-muted)',
              border: '1px solid var(--tc-border)',
            }}
          >
            {tag}
          </span>
        ))}
      </motion.div>
    </div>
  );
}
