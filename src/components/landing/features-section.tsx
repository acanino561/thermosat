'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

const features = [
  {
    icon: '🛰️',
    title: 'Physics-Accurate Solver',
    desc: 'RK4 + Implicit Euler transient solver with adaptive timestepping. 10 out of 10 V&V benchmarks passing against analytical solutions.',
  },
  {
    icon: '🔥',
    title: 'What If Instant Replay',
    desc: 'Drag a slider, see temperatures update in real time. Sensitivity analysis computed in seconds with finite-difference perturbation.',
  },
  {
    icon: '🌍',
    title: 'Orbit Playback',
    desc: 'Watch your spacecraft orbit in 3D with real-time shadow mapping, eclipse detection, and terminator line rendering.',
  },
  {
    icon: '⚡',
    title: '175× Performance Speedup',
    desc: '1,000-node transient simulations complete in under 1 second. Adjacency-list solver with batched DB writes.',
  },
  {
    icon: '📄',
    title: 'PDF Reports',
    desc: 'Export publication-quality thermal analysis reports with 9 sections including orbit plots, temperature traces, and sensitivity matrices.',
  },
  {
    icon: '🔐',
    title: 'Secure & Cloud-Native',
    desc: 'Your models live in the cloud. Access from anywhere. Built on Next.js + Neon Postgres with enterprise-grade security.',
  },
];

export function FeaturesSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });
  const bgY = useTransform(scrollYProgress, [0, 1], [40, -40]);

  return (
    <section
      id="features"
      ref={sectionRef}
      className="relative py-24 lg:py-32 px-6 lg:px-10 overflow-hidden"
      style={{ borderTop: '1px solid var(--tc-border)' }}
    >
      <motion.div
        style={{ y: bgY }}
        className="absolute inset-0 eng-grid pointer-events-none opacity-30"
        aria-hidden
      />

      <div className="relative z-10 max-w-[1400px] mx-auto">
        {/* Section header */}
        <div className="mb-6">
          <span className="data-label">CAPABILITIES</span>
        </div>
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-16">
          <h2 className="font-mono font-bold text-display-lg tracking-tight max-w-2xl" style={{ color: 'var(--tc-text)' }}>
            Feature<br />
            <span className="text-accent">highlights</span>
          </h2>
          <p
            className="max-w-md text-sm leading-relaxed font-sans lg:text-right"
            style={{ color: 'var(--tc-text-secondary)' }}
          >
            Purpose-built for spacecraft thermal engineers.
            Every feature designed around real engineering workflows.
          </p>
        </div>

        {/* 3-column grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px" style={{ backgroundColor: 'var(--tc-border)' }}>
          {features.map((feat, i) => (
            <motion.div
              key={feat.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
              className="p-6 lg:p-8 group cursor-default"
              style={{ backgroundColor: 'var(--tc-surface)' }}
            >
              <div className="flex items-baseline justify-between mb-5">
                <span className="text-2xl">{feat.icon}</span>
                <span className="font-mono text-[10px] tabular-nums" style={{ color: 'var(--tc-text-dim)' }}>
                  {String(i + 1).padStart(2, '0')}/{String(features.length).padStart(2, '0')}
                </span>
              </div>

              <h3
                className="font-mono text-base font-semibold leading-snug mb-3"
                style={{ color: 'var(--tc-text)' }}
              >
                {feat.title}
              </h3>

              <p
                className="text-sm leading-relaxed font-sans"
                style={{ color: 'var(--tc-text-secondary)' }}
              >
                {feat.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
