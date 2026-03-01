'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const items = [
  {
    num: '01',
    title: 'COMPLETE MISSION PROVENANCE',
    body: 'Every simulation run, what-if study, and design review comment is stored with the model that produced it. Your current thermal design traces back to PDR baseline — searchable, version-controlled, and attributable. The full engineering record, not just the latest export.',
  },
  {
    num: '02',
    title: 'DELIVERABLE-READY OUTPUT',
    body: 'Export thermal analysis citations for CDR packages with benchmark compliance reports auto-generated. Verixos version, benchmark results B1–B10, and model hash are included in every report — so your review board gets everything they need without extra work.',
  },
  {
    num: '03',
    title: 'NATIVE CI/CD INTEGRATION',
    body: 'Run thermal margin checks on every commit. Connect Verixos to GitHub Actions, GitLab CI, or Jenkins — get a pass/fail badge before hardware is committed. Thermal analysis moves at the speed of your software pipeline, not your review calendar.',
  },
  {
    num: '04',
    title: 'SHARED ENGINEERING KNOWLEDGE',
    body: 'Custom materials, flight-heritage optical properties, mission bus templates, and node libraries are shared across your organisation. Junior engineers work from the same validated baselines as senior staff — institutional knowledge encoded into the platform, not locked in someone\'s head.',
  },
  {
    num: '05',
    title: 'BUILT FOR THE NEXT GENERATION',
    body: 'The academic tier exists because the engineers who learn tools at university carry them into industry. Free access for students and researchers means Verixos is taught alongside the physics it simulates — the same way a generation of engineers learned MATLAB.',
  },
];

export function MoatSection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.1 });

  return (
    <section
      ref={ref}
      className="relative py-24 lg:py-32 px-6 lg:px-10 overflow-hidden"
      style={{ borderTop: '1px solid var(--tc-border)' }}
    >
      <div className="absolute inset-0 eng-grid pointer-events-none opacity-10" aria-hidden />

      <div className="relative z-10 max-w-[1400px] mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
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
                your programme
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

        {/* Items */}
        <div className="space-y-0">
          {items.map((item, i) => (
            <motion.div
              key={item.num}
              initial={{ opacity: 0, y: 16 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.15 + i * 0.1, duration: 0.45 }}
              className="flex flex-col sm:flex-row gap-6 sm:gap-10 py-8"
              style={{ borderBottom: '1px solid var(--tc-border)' }}
            >
              {/* Number */}
              <div
                className="font-mono font-bold shrink-0"
                style={{
                  color: 'var(--tc-accent)',
                  fontSize: 'clamp(2rem, 4vw, 3.5rem)',
                  lineHeight: 1,
                  opacity: 0.7,
                  width: '4rem',
                }}
              >
                {item.num}
              </div>

              {/* Content */}
              <div className="flex-1">
                <div
                  className="font-mono text-xs tracking-[0.18em] mb-3"
                  style={{ color: 'var(--tc-text)' }}
                >
                  {item.title}
                </div>
                <p
                  className="text-sm leading-relaxed font-sans max-w-2xl"
                  style={{ color: 'var(--tc-text-secondary)' }}
                >
                  {item.body}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
