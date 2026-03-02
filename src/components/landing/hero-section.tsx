'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';

interface TelemetryPoint {
  label: string;
  tempC: number;
  status: 'WARN' | 'NOM';
  x: string;
  y: string;
  phase: number;
  amplitude: number;
}

const TELEMETRY_POINTS: TelemetryPoint[] = [
  { label: 'SOLAR PANEL +Y', tempC:  62, status: 'NOM', x: 'right-[5%]',  y: 'top-[22%]', phase: 0,    amplitude: 80 },
  { label: 'BUS CORE',       tempC:  21, status: 'NOM', x: 'right-[8%]',  y: 'top-[42%]', phase: 0.5,  amplitude: 15 },
  { label: 'RADIATOR -Z',    tempC: -78, status: 'NOM', x: 'right-[3%]',  y: 'top-[58%]', phase: 1.0,  amplitude: 30 },
  { label: 'ANTENNA FEED',   tempC: -12, status: 'NOM', x: 'right-[12%]', y: 'top-[74%]', phase: 0.8,  amplitude: 20 },
];

function AnimatedTelemetry({ isVisible }: { isVisible: boolean }) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!isVisible) return;
    const id = setInterval(() => setTick((t) => t + 1), 80);
    return () => clearInterval(id);
  }, [isVisible]);

  const t = (tick * 80 / 10000) * 2 * Math.PI;

  return (
    <div className="absolute inset-0 z-20 pointer-events-none hidden lg:block" aria-hidden>
      {TELEMETRY_POINTS.map((pt, i) => {
        const temp = pt.tempC + pt.amplitude * Math.sin(t + pt.phase);
        const isWarn = temp > 100 || temp < -100;
        const sign = temp >= 0 ? '+' : '';
        const display = `${sign}${temp.toFixed(1)}°C`;

        return (
          <motion.div
            key={pt.label}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: isVisible ? 1 : 0, x: isVisible ? 0 : 20 }}
            transition={{ delay: 1.8 + i * 0.15, duration: 0.4 }}
            className={`absolute ${pt.x} ${pt.y}`}
          >
            <div className="font-mono text-[10px] tracking-[0.1em] flex items-baseline gap-3">
              <span style={{ color: 'var(--tc-text-muted)' }}>{pt.label}</span>
              <span
                className="text-sm font-semibold tabular-nums"
                style={{
                  color: isWarn ? 'var(--tc-accent)' : 'var(--tc-text)',
                  transition: 'color 0.3s ease',
                }}
              >
                {display}
              </span>
            </div>
            <div
              className="h-px mt-1"
              style={{
                background: `linear-gradient(90deg, rgba(var(--tc-accent-rgb), ${isWarn ? 0.4 : 0.15}), transparent)`,
                width: '80px',
                transition: 'opacity 0.3s ease',
              }}
            />
          </motion.div>
        );
      })}
    </div>
  );
}

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
        NASA SP-8055 VALIDATED
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
  const [shown, setShown] = useState(false);
  useEffect(() => { const t = setTimeout(() => setShown(true), 1500); return () => clearTimeout(t); }, []);

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
        {/* TEST: stock video hero — swap back to SatelliteScene when done evaluating */}
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: 'center center' }}
        >
          <source src="/hero-test.mp4" type="video/mp4" />
        </video>
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

      {/* Animated telemetry overlays */}
      <AnimatedTelemetry isVisible={shown} />

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
          NASA SP-8055 + ECSS VALIDATED
        </motion.div>

        <div className="max-w-3xl lg:max-w-[38%]">
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
              Cloud-native. Physics-accurate. Standards-validated.
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
            Cloud-native simulation for the next generation of space hardware. Validated against NASA SP-8055 and ECSS standards. Solve 1,000+ nodes in &lt;1s.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.6, duration: 0.5 }}
            className="mt-10 flex flex-wrap items-center gap-4"
          >
            <Link
              href="/login"
              className="inline-flex items-center gap-2 font-mono text-xs tracking-[0.15em] px-6 py-3.5 transition-all duration-200 hover:shadow-[0_0_30px_rgba(var(--tc-accent-rgb),0.3)]"
              style={{ backgroundColor: 'var(--tc-accent)', color: '#fff' }}
            >
              GET STARTED
              <span>→</span>
            </Link>
            <a
              href="#demo"
              className="inline-flex items-center gap-2 font-mono text-xs tracking-[0.15em] px-6 py-3.5 transition-colors duration-200 hover:text-accent"
              style={{ color: 'var(--tc-text-secondary)', border: '1px solid var(--tc-border)' }}
            >
              TRY THE DEMO
            </a>
          </motion.div>
        </div>
      </motion.div>

      <StatusBar />
    </section>
  );
}
