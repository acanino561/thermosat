'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

const benchmarks = [
  'Two-node conduction',
  'Radiation equilibrium',
  'ISS orbital environment',
  'Multi-node networks',
  'Transient response',
  'Heat pipe conductors',
  'Monte Carlo view factors',
];

export function VvBadgeSection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section
      ref={ref}
      className="relative py-24 lg:py-32 px-6 lg:px-10 overflow-hidden"
      style={{ borderTop: '1px solid var(--tc-border)' }}
    >
      <div className="absolute inset-0 eng-grid pointer-events-none opacity-20" aria-hidden />

      <div className="relative z-10 max-w-[1400px] mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={isInView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.6 }}
        >
          <span className="data-label">VERIFICATION & VALIDATION</span>

          <div className="mt-8 font-mono font-bold text-accent" style={{ fontSize: 'clamp(5rem, 12vw, 10rem)', lineHeight: '0.9' }}>
            10/10
          </div>

          <h2 className="mt-4 font-mono font-bold text-display tracking-tight" style={{ color: 'var(--tc-text)' }}>
            V&V Benchmarks Passing
          </h2>

          <p
            className="mt-4 max-w-2xl mx-auto text-base leading-relaxed font-sans"
            style={{ color: 'var(--tc-text-secondary)' }}
          >
            Validated against analytical solutions from Incropera, NASA SP-8055, and ECSS standards.
          </p>
        </motion.div>

        {/* Benchmark list */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="mt-12 flex flex-wrap justify-center gap-x-6 gap-y-3"
        >
          {benchmarks.map((b, i) => (
            <span key={b} className="font-mono text-xs tracking-[0.1em] flex items-center gap-2" style={{ color: 'var(--tc-text-muted)' }}>
              {i > 0 && <span className="text-accent opacity-40">·</span>}
              {b}
            </span>
          ))}
        </motion.div>

        <div className="rule-accent mx-auto max-w-xl mt-12" />
      </div>
    </section>
  );
}
