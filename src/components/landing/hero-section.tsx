'use client';

import dynamic from 'next/dynamic';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import Link from 'next/link';

const SatelliteScene = dynamic(
  () => import('@/components/three/satellite-scene').then((mod) => mod.SatelliteScene),
  { ssr: false },
);

function StatusBar() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 2.5, duration: 0.8 }}
      className="absolute bottom-0 left-0 right-0 flex items-center gap-6 px-6 lg:px-10 py-3 font-mono text-[10px] tracking-[0.15em] overflow-x-auto"
      style={{ borderTop: '1px solid var(--tc-border)', color: 'var(--tc-text-muted)' }}
    >
      <span className="flex items-center gap-2 shrink-0">
        <span className="status-dot" />
        V&V: 10/10 PASSING
      </span>
      <span className="shrink-0" style={{ color: 'var(--tc-text-dim)' }}>│</span>
      <span className="shrink-0">SOLVER: RK4 + IMPLICIT EULER</span>
      <span className="shrink-0" style={{ color: 'var(--tc-text-dim)' }}>│</span>
      <span className="shrink-0">PERF: 175× SPEEDUP</span>
      <span className="shrink-0" style={{ color: 'var(--tc-text-dim)' }}>│</span>
      <span className="shrink-0">NODES: 1,000 IN &lt;1s</span>
      <span className="shrink-0" style={{ color: 'var(--tc-text-dim)' }}>│</span>
      <span className="shrink-0">PLATFORM: BROWSER-NATIVE</span>
    </motion.div>
  );
}

export function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  });

  const gridY = useTransform(scrollYProgress, [0, 1], [0, -80]);
  const contentY = useTransform(scrollYProgress, [0, 1], [0, 60]);
  const sceneY = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const fadeOut = useTransform(scrollYProgress, [0, 0.6, 1], [1, 1, 0]);

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen flex flex-col overflow-hidden"
      style={{ borderBottom: '1px solid var(--tc-border)' }}
    >
      {/* Engineering grid background with parallax */}
      <motion.div
        style={{ y: gridY }}
        className="absolute inset-0 eng-grid-dense pointer-events-none"
        aria-hidden
      />

      {/* 3D Scene — positioned right side on desktop */}
      <motion.div
        style={{ y: sceneY, opacity: fadeOut }}
        className="absolute inset-0 lg:left-[35%]"
      >
        <SatelliteScene />
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(90deg, var(--tc-base) 0%, var(--tc-base) 20%, transparent 55%, transparent 100%)`,
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(180deg, var(--tc-base) 0%, transparent 15%, transparent 85%, var(--tc-base) 100%)`,
          }}
        />
      </motion.div>

      {/* Main content */}
      <motion.div
        style={{ y: contentY, opacity: fadeOut }}
        className="relative z-20 flex-1 flex flex-col justify-center px-6 lg:px-10 max-w-[1400px] mx-auto w-full pt-20"
      >
        {/* System status tag */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="font-mono text-[10px] tracking-[0.2em] mb-8 flex items-center gap-3"
          style={{ color: 'var(--tc-text-muted)' }}
        >
          <span className="status-dot" />
          TFAWS-GRADE V&V — 10/10 BENCHMARKS PASSING
        </motion.div>

        <div className="max-w-3xl">
          <h1 className="font-mono font-bold tracking-tighter leading-[0.9]">
            <motion.span
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="block text-display-xl"
              style={{ color: 'var(--tc-text)' }}
            >
              SPACECRAFT
            </motion.span>
            <motion.span
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.65, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="block text-display-xl"
              style={{ color: 'var(--tc-text)' }}
            >
              THERMAL
            </motion.span>
            <motion.span
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="block text-display-xl text-accent"
            >
              REIMAGINED
            </motion.span>
          </h1>

          {/* Sub-tagline */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.8 }}
            className="mt-8 font-mono text-sm leading-relaxed"
            style={{ color: 'var(--tc-text-muted)' }}
          >
            <span className="text-accent opacity-60">▸</span>{' '}
            <span style={{ color: 'var(--tc-text-secondary)' }}>
              Browser-native. Physics-accurate. Demo-ready.
            </span>
          </motion.div>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.4, duration: 0.5 }}
            className="mt-6 text-base max-w-lg leading-relaxed font-sans"
            style={{ color: 'var(--tc-text-secondary)' }}
          >
            Cloud-native spacecraft thermal analysis with RK4 and Implicit Euler solvers. 
            Validated against analytical solutions from Incropera, NASA SP-8055, and ECSS standards 
            — 10 out of 10 V&V benchmarks passing.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.6, duration: 0.5 }}
            className="mt-10 flex flex-wrap items-center gap-4"
          >
            <Link
              href="/auth/signin"
              className="inline-flex items-center gap-2 font-mono text-xs tracking-[0.15em] px-6 py-3.5 transition-all duration-200 hover:shadow-[0_0_30px_rgba(var(--tc-accent-rgb),0.3)]"
              style={{ backgroundColor: 'var(--tc-accent)', color: '#fff' }}
            >
              START FREE TRIAL
              <span>→</span>
            </Link>
            <a
              href="#demo"
              className="inline-flex items-center gap-2 font-mono text-xs tracking-[0.15em] px-6 py-3.5 transition-colors duration-200 hover:text-accent"
              style={{ color: 'var(--tc-text-secondary)', border: '1px solid var(--tc-border)' }}
            >
              WATCH DEMO
            </a>
          </motion.div>
        </div>
      </motion.div>

      <StatusBar />
    </section>
  );
}
