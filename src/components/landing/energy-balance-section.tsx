'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform, useInView, MotionValue } from 'framer-motion';

/* ── Satellite silhouette ────────────────────────────────────── */
function SatSilhouette() {
  return (
    <svg width="52" height="30" viewBox="0 0 52 30" fill="none" aria-hidden>
      <rect x="0" y="12" width="14" height="6" rx="1" fill="currentColor" />
      <line x1="4.5" y1="12" x2="4.5" y2="18" stroke="rgba(0,0,0,0.25)" strokeWidth="0.8" />
      <line x1="9" y1="12" x2="9" y2="18" stroke="rgba(0,0,0,0.25)" strokeWidth="0.8" />
      <rect x="15" y="5" width="22" height="20" rx="2" fill="currentColor" />
      <rect x="18" y="9" width="16" height="12" rx="1" fill="rgba(0,0,0,0.2)" />
      <rect x="38" y="12" width="14" height="6" rx="1" fill="currentColor" />
      <line x1="42.5" y1="12" x2="42.5" y2="18" stroke="rgba(0,0,0,0.25)" strokeWidth="0.8" />
      <line x1="47" y1="12" x2="47" y2="18" stroke="rgba(0,0,0,0.25)" strokeWidth="0.8" />
      <line x1="26" y1="5" x2="26" y2="1" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="26" cy="0.5" r="1" fill="currentColor" />
    </svg>
  );
}

/* ── Orbital arc background ──────────────────────────────────── */
function OrbitalArcBg({ scrollProgress }: { scrollProgress: MotionValue<number> }) {
  // Purely scroll-driven: satellite sweeps left → across the sun → right as section scrolls
  // angle: π (left) → -0.2 (past the sun on the right) over the full scroll range
  const angle = useTransform(scrollProgress, (p: number) => {
    const clamped = Math.min(Math.max(p, 0), 1);
    return Math.PI * 1.05 - clamped * Math.PI * 1.25; // ~3.3 → -0.2 rad
  });

  const satX = useTransform(angle, (a: number) => `${42 + 50 * Math.cos(a)}%`);
  const satY = useTransform(angle, (a: number) => `${70 - 58 * Math.sin(a)}%`);
  const satRotate = useTransform(angle, (a: number) =>
    -(Math.atan2(58 * Math.cos(a), 46 * Math.sin(a)) * 180 / Math.PI),
  );
  // Dimmed when on back arc (upper screen, behind sun), full when on front arc
  const satOpacity = useTransform(angle, (a: number) => Math.sin(a) > 0.15 ? 0.35 : 0.85);
  // Glow pulses as satellite nears the sun (angle ≈ 0 = rightmost / sun side)
  const glowOp = useTransform(angle, (a: number) => Math.max(0, Math.cos(a)) * 0.6);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden style={{ zIndex: 1 }}>
      {/* Layer 1 — Back arc (behind sun) */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
          viewBox="0 0 1400 700" preserveAspectRatio="xMidYMid slice">
          <path d="M 2030 490 A 980 350 0 0 0 70 490" fill="none" stroke="rgba(255,150,40,0.06)" strokeWidth="1.5" strokeDasharray="5 10" />
        </svg>
      </div>

      {/* Layer 2 — Sun bloom (between arcs) */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 2 }}>
        {/* Sun bloom — outer */}
        <div style={{
          position: 'absolute', right: '10%', top: '42%',
          transform: 'translate(50%, -50%)', width: 340, height: 340, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,210,80,0.15) 0%, rgba(255,130,30,0.08) 38%, rgba(255,50,0,0.03) 65%, transparent 80%)',
          filter: 'blur(6px)',
        }} />
        {/* Sun core */}
        <div style={{
          position: 'absolute', right: '10%', top: '42%',
          transform: 'translate(50%, -50%)', width: 44, height: 44, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,235,130,0.55) 0%, rgba(255,180,60,0.3) 55%, transparent 100%)',
          filter: 'blur(1px)',
        }} />
      </div>

      {/* Layer 3 — Front arc + satellite (in front of sun) */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 3 }}>
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
          viewBox="0 0 1400 700" preserveAspectRatio="xMidYMid slice">
          <path d="M 70 490 A 980 350 0 0 1 2030 490" fill="none" stroke="rgba(255,150,40,0.15)" strokeWidth="1.5" strokeDasharray="5 10" />
        </svg>

        {/* Satellite */}
        <motion.div style={{
          position: 'absolute', left: satX, top: satY,
          rotate: satRotate, translateX: '-50%', translateY: '-50%',
          color: 'rgba(200,215,225,0.8)',
          opacity: satOpacity,
        }}>
          <motion.div style={{
            position: 'absolute', inset: -14, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,215,80,0.5) 0%, transparent 70%)',
            opacity: glowOp, filter: 'blur(2px)',
          }} />
          <SatSilhouette />
        </motion.div>
      </div>
    </div>
  );
}


const energyTerms = [
  {
    symbol: 'Q_solar',
    label: 'Solar Flux',
    value: '1,361 W/m²',
    desc: 'Direct solar irradiance at 1 AU. Computed for actual orbit geometry, shadow periods, and panel orientation.',
    formula: 'αₛ · Aₚ · S · cos(θ)',
  },
  {
    symbol: 'Q_albedo',
    label: 'Earth Albedo',
    value: '0.30 avg',
    desc: 'Reflected solar energy from Earth surface. Varies with latitude, cloud cover, and surface type.',
    formula: 'αₛ · a · S · F_earth · Aₚ',
  },
  {
    symbol: 'Q_IR',
    label: 'Earth IR',
    value: '237 W/m²',
    desc: 'Infrared radiation emitted by Earth. Temperature-dependent, computed per orbital position.',
    formula: 'ε · σ · T⁴_earth · F_earth · Aₚ',
  },
  {
    symbol: 'Q_int',
    label: 'Internal Dissipation',
    value: 'Per component',
    desc: 'Heat generated by electronics, batteries, payloads. Time-varying power profiles per operational mode.',
    formula: 'Σ P_component(t)',
  },
];

function EquationDisplay() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0 }}
      animate={isInView ? { opacity: 1 } : {}}
      transition={{ duration: 1 }}
      className="py-16"
    >
      {/* The master equation */}
      <div className="text-center mb-4">
        <span className="data-label">ENERGY BALANCE EQUATION</span>
      </div>
      <div
        className="font-mono text-lg md:text-2xl lg:text-3xl text-center py-8 leading-relaxed"
        style={{ color: 'var(--tc-text)' }}
      >
        <motion.span
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <span className="text-accent">Q</span>
          <sub className="text-xs" style={{ color: 'var(--tc-text-muted)' }}>solar</sub>
        </motion.span>
        <span className="mx-2" style={{ color: 'var(--tc-text-dim)' }}>+</span>
        <motion.span
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.35, duration: 0.5 }}
        >
          <span className="text-accent">Q</span>
          <sub className="text-xs" style={{ color: 'var(--tc-text-muted)' }}>albedo</sub>
        </motion.span>
        <span className="mx-2" style={{ color: 'var(--tc-text-dim)' }}>+</span>
        <motion.span
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          <span className="text-accent">Q</span>
          <sub className="text-xs" style={{ color: 'var(--tc-text-muted)' }}>IR</sub>
        </motion.span>
        <span className="mx-2" style={{ color: 'var(--tc-text-dim)' }}>+</span>
        <motion.span
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.65, duration: 0.5 }}
        >
          <span className="text-accent">Q</span>
          <sub className="text-xs" style={{ color: 'var(--tc-text-muted)' }}>int</sub>
        </motion.span>
        <span className="mx-4" style={{ color: 'var(--tc-text-dim)' }}>=</span>
        <motion.span
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.8, duration: 0.5 }}
        >
          <span style={{ color: 'var(--tc-text)' }}>εσT</span>
          <sup className="text-sm">4</sup>
        </motion.span>
        <span className="mx-2" style={{ color: 'var(--tc-text-dim)' }}>+</span>
        <motion.span
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.95, duration: 0.5 }}
        >
          <span style={{ color: 'var(--tc-text)' }}>mc</span>
          <span style={{ color: 'var(--tc-text-muted)' }}>(</span>
          <span style={{ color: 'var(--tc-text)' }}>dT/dt</span>
          <span style={{ color: 'var(--tc-text-muted)' }}>)</span>
        </motion.span>
      </div>
      <div className="rule-accent mx-auto max-w-xl" />
    </motion.div>
  );
}

export function EnergyBalanceSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });

  const bgY = useTransform(scrollYProgress, [0, 1], [60, -60]);

  return (
    <section
      id="analysis"
      ref={sectionRef}
      className="relative py-24 lg:py-32 px-6 lg:px-10 overflow-hidden"
    >
      {/* Parallax grid behind */}
      <motion.div
        style={{ y: bgY }}
        className="absolute inset-0 eng-grid pointer-events-none opacity-50"
        aria-hidden
      />

      {/* Scroll-linked orbital arc + satellite + sun bloom */}
      <OrbitalArcBg scrollProgress={scrollYProgress} />

      <div className="relative z-10 max-w-[1400px] mx-auto">
        {/* Section header — left-aligned */}
        <div className="mb-6">
          <span className="data-label">SECTION 01</span>
        </div>
        <h2 className="font-mono font-bold text-display-lg tracking-tight max-w-3xl" style={{ color: 'var(--tc-text)' }}>
          The physics your hardware
          <br />
          <span className="text-accent">demands</span>
        </h2>
        <p
          className="mt-4 max-w-xl text-base leading-relaxed font-sans"
          style={{ color: 'var(--tc-text-secondary)' }}
        >
          Every spacecraft thermal analysis comes down to one equation. We solve it 
          with engineering-grade numerical methods — transient and steady-state — 
          for every node in your thermal network.
        </p>

        {/* Equation display */}
        <EquationDisplay />

        {/* Energy terms grid — asymmetric layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-px mt-8" style={{ backgroundColor: 'var(--tc-border)' }}>
          {energyTerms.map((term, i) => (
            <motion.div
              key={term.symbol}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="p-8 relative group"
              style={{ backgroundColor: 'var(--tc-surface)' }}
            >
              {/* Term number */}
              <div className="flex items-baseline justify-between mb-4">
                <span className="data-label">{term.symbol.toUpperCase()}</span>
                <span className="font-mono text-xs tabular-nums" style={{ color: 'var(--tc-text-muted)' }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
              </div>

              <h3 className="font-mono text-lg font-semibold mb-1" style={{ color: 'var(--tc-text)' }}>
                {term.label}
              </h3>
              <div className="font-mono text-sm mb-3 text-accent">
                {term.value}
              </div>
              <p className="text-sm leading-relaxed font-sans" style={{ color: 'var(--tc-text-secondary)' }}>
                {term.desc}
              </p>

              {/* Formula */}
              <div
                className="mt-4 pt-4 font-mono text-xs"
                style={{ borderTop: '1px solid var(--tc-border)', color: 'var(--tc-text-muted)' }}
              >
                <span className="text-accent opacity-60">▸</span> {term.formula}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
