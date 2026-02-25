'use client';

import { useRef, useEffect, useState } from 'react';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';

interface TelemetryDatum {
  label: string;
  value: string;
  unit: string;
}

const telemetryData: TelemetryDatum[] = [
  { label: 'σ (STEFAN-BOLTZMANN)', value: '5.670×10⁻⁸', unit: 'W/m²K⁴' },
  { label: 'SOLAR CONSTANT', value: '1,361', unit: 'W/m²' },
  { label: 'EARTH ALBEDO', value: '0.306', unit: 'avg' },
  { label: 'EARTH IR', value: '237', unit: 'W/m²' },
  { label: 'ORBIT PERIOD', value: '92.68', unit: 'min' },
  { label: 'NODES SOLVED', value: '1,247', unit: 'active' },
  { label: 'Δt STEP', value: '0.5', unit: 'sec' },
  { label: 'CONVERGENCE', value: '10⁻⁶', unit: 'K' },
];

function AnimatedValue({ value, delay }: { value: string; delay: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const [displayed, setDisplayed] = useState('—');

  useEffect(() => {
    if (!isInView) return;
    const timeout = setTimeout(() => {
      setDisplayed(value);
    }, delay * 1000);
    return () => clearTimeout(timeout);
  }, [isInView, value, delay]);

  return (
    <span ref={ref} className="tabular-nums">
      {displayed}
    </span>
  );
}

export function TelemetryStrip() {
  const stripRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: stripRef,
    offset: ['start end', 'end start'],
  });
  const x = useTransform(scrollYProgress, [0, 1], [60, -60]);

  return (
    <div
      ref={stripRef}
      className="relative overflow-hidden py-6"
      style={{
        borderTop: '1px solid var(--tc-border)',
        borderBottom: '1px solid var(--tc-border)',
        backgroundColor: 'var(--tc-surface)',
      }}
    >
      <motion.div
        style={{ x }}
        className="flex items-center gap-8 lg:gap-12 px-6 lg:px-10 min-w-max"
      >
        {telemetryData.map((datum, i) => (
          <div key={datum.label} className="flex items-baseline gap-3 shrink-0">
            <span className="font-mono text-[9px] tracking-[0.15em] whitespace-nowrap" style={{ color: 'var(--tc-text-muted)' }}>
              {datum.label}
            </span>
            <span className="font-mono text-sm font-semibold" style={{ color: 'var(--tc-text)' }}>
              <AnimatedValue value={datum.value} delay={0.3 + i * 0.1} />
            </span>
            <span className="font-mono text-[10px]" style={{ color: 'var(--tc-text-muted)' }}>
              {datum.unit}
            </span>
          </div>
        ))}

        {/* Duplicate for seamless feel */}
        {telemetryData.slice(0, 3).map((datum) => (
          <div key={`dup-${datum.label}`} className="flex items-baseline gap-3 shrink-0">
            <span className="font-mono text-[9px] tracking-[0.15em] whitespace-nowrap" style={{ color: 'var(--tc-text-muted)' }}>
              {datum.label}
            </span>
            <span className="font-mono text-sm font-semibold" style={{ color: 'var(--tc-text)' }}>
              {datum.value}
            </span>
            <span className="font-mono text-[10px]" style={{ color: 'var(--tc-text-muted)' }}>
              {datum.unit}
            </span>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
