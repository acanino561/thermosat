'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const items = [
  {
    num: '01',
    title: 'MODEL LINEAGE',
    body: 'Every simulation run, what-if study, and design review comment is stored with the model that produced it. Your current thermal design traces back to PDR baseline. That provenance lives in your mission documents. Migrating means losing the paper trail — and re-validating everything from scratch.',
  },
  {
    num: '02',
    title: 'CITED IN DELIVERABLES',
    body: 'Once a CDR says "thermal analysis per Verixos v2.x, benchmarks B1–B10 pass", the next review board expects continuity. Switching tools requires re-running all analyses and re-establishing benchmark compliance — a multi-week effort no programme manager approves mid-mission.',
  },
  {
    num: '03',
    title: 'PIPELINE INTEGRATION',
    body: 'When verixos check --thermal-margins is green in your CI pipeline, it becomes infrastructure, not a tool. The thermal margin badge is expected on every commit — by your PM, your systems engineer, and your customer. Removing it requires a pipeline change and re-approval.',
  },
  {
    num: '04',
    title: 'ORG KNOWLEDGE BASE',
    body: 'Custom materials, flight-heritage optical properties, mission bus templates, and node libraries are shared across your organisation. Junior engineers inherit senior knowledge automatically. Leaving means rebuilding years of institutional knowledge from scratch.',
  },
  {
    num: '05',
    title: 'THE ACADEMIC FLYWHEEL',
    body: 'Students who learn Verixos today join Rocket Lab, ISRO, and NASA tomorrow. They advocate for it from the inside. This is how MATLAB won a generation of engineers. The academic tier exists for exactly this reason — and the flywheel starts compounding now.',
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
                Why teams
              </span>
              <span className="block text-3xl lg:text-4xl" style={{ color: 'var(--tc-accent)' }}>
                don&apos;t leave
              </span>
            </h2>

            <p
              className="lg:max-w-md text-sm leading-relaxed font-sans"
              style={{ color: 'var(--tc-text-secondary)' }}
            >
              The value of Verixos compounds over time. Every month you use it, switching costs grow
              — not through lock-in, but through accumulated trust, provenance, and institutional knowledge.
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
