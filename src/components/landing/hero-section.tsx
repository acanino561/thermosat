'use client';

import dynamic from 'next/dynamic';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import Link from 'next/link';

const SatelliteScene = dynamic(
  () => import('@/components/three/satellite-scene').then((mod) => mod.SatelliteScene),
  { ssr: false },
);

/* Telemetry data overlays */
const telemetryReadouts = [
  { label: 'SOLAR PANEL +Y', value: '+142.3°C', status: 'WARN', x: 'right-[5%]', y: 'top-[22%]' },
  { label: 'BUS CORE', value: '+21.7°C', status: 'NOM', x: 'right-[8%]', y: 'top-[42%]' },
  { label: 'RADIATOR -Z', value: '-78.4°C', status: 'NOM', x: 'right-[3%]', y: 'top-[58%]' },
  { label: 'ANTENNA FEED', value: '-12.6°C', status: 'NOM', x: 'right-[12%]', y: 'top-[74%]' },
];

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
        SYS: NOMINAL
      </span>
      <span className="shrink-0" style={{ color: 'var(--tc-text-dim)' }}>│</span>
      <span className="shrink-0">ORBIT: LEO 408 km × 410 km</span>
      <span className="shrink-0" style={{ color: 'var(--tc-text-dim)' }}>│</span>
      <span className="shrink-0">INCL: 51.64°</span>
      <span className="shrink-0" style={{ color: 'var(--tc-text-dim)' }}>│</span>
      <span className="shrink-0">β ANGLE: 52.3°</span>
      <span className="shrink-0" style={{ color: 'var(--tc-text-dim)' }}>│</span>
      <span className="shrink-0">ECLIPSE: 35.2 min</span>
      <span className="shrink-0" style={{ color: 'var(--tc-text-dim)' }}>│</span>
      <span className="shrink-0">Qs: 1361 W/m²</span>
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
        {/* Scene overlay gradient for text readability */}
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

      {/* Telemetry readouts floating over 3D scene */}
      <div className="absolute inset-0 z-20 pointer-events-none hidden lg:block">
        {telemetryReadouts.map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.8 + i * 0.15, duration: 0.4 }}
            className={`absolute ${item.x} ${item.y}`}
          >
            <div className="font-mono text-[10px] tracking-[0.1em] flex items-baseline gap-3">
              <span style={{ color: 'var(--tc-text-muted)' }}>{item.label}</span>
              <span
                className="text-sm font-semibold tabular-nums"
                style={{ color: item.status === 'WARN' ? 'var(--tc-accent)' : 'var(--tc-text)' }}
              >
                {item.value}
              </span>
            </div>
            <div
              className="h-px mt-1"
              style={{
                background: `linear-gradient(90deg, rgba(var(--tc-accent-rgb), ${item.status === 'WARN' ? '0.4' : '0.1'}), transparent)`,
                width: '80px',
              }}
            />
          </motion.div>
        ))}
      </div>

      {/* Main content — left-aligned, asymmetric */}
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
          THERMAL ANALYSIS PLATFORM v2.1 — PUBLIC BETA
        </motion.div>

        {/* Massive asymmetric headline */}
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
              ANALYSIS
            </motion.span>
          </h1>

          {/* Stefan-Boltzmann equation as design element */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.8 }}
            className="mt-8 font-mono text-sm leading-relaxed"
            style={{ color: 'var(--tc-text-muted)' }}
          >
            <span className="text-accent opacity-60">▸</span>{' '}
            <span style={{ color: 'var(--tc-text-secondary)' }}>
              q<sub>rad</sub> = εσT<sup>4</sup>
            </span>
            <span className="mx-3" style={{ color: 'var(--tc-text-dim)' }}>│</span>
            <span style={{ color: 'var(--tc-text-secondary)' }}>
              Q<sub>solar</sub> + Q<sub>albedo</sub> + Q<sub>IR</sub> + Q<sub>int</sub> = Q<sub>rad</sub> + mc(dT/dt)
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
            Engineering-grade spacecraft thermal analysis — fast, accurate, cloud-native. 
            3D CAD import, orbital environment solver, V&V benchmarks, and multi-format export. 
            Built for SmallSat startups, university teams, and NewSpace engineers.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.6, duration: 0.5 }}
            className="mt-10 flex flex-wrap items-center gap-4"
          >
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 font-mono text-xs tracking-[0.15em] px-6 py-3.5 transition-all duration-200 hover:shadow-[0_0_30px_rgba(var(--tc-accent-rgb),0.3)]"
              style={{ backgroundColor: 'var(--tc-accent)', color: '#fff' }}
            >
              ACCESS CONSOLE
              <span>→</span>
            </Link>
            <Link
              href="#analysis"
              className="inline-flex items-center gap-2 font-mono text-xs tracking-[0.15em] px-6 py-3.5 transition-colors duration-200 hover:text-accent"
              style={{ color: 'var(--tc-text-secondary)', border: '1px solid var(--tc-border)' }}
            >
              VIEW DOCUMENTATION
            </Link>
          </motion.div>
        </div>
      </motion.div>

      {/* Bottom status bar */}
      <StatusBar />
    </section>
  );
}
