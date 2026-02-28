'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import Link from 'next/link';

export function CtaSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });
  const gridY = useTransform(scrollYProgress, [0, 1], [30, -30]);

  return (
    <section
      ref={sectionRef}
      className="relative py-24 lg:py-32 px-6 lg:px-10 overflow-hidden"
      style={{ borderTop: '1px solid var(--tc-border)' }}
    >
      {/* Parallax grid */}
      <motion.div
        style={{ y: gridY }}
        className="absolute inset-0 eng-grid pointer-events-none opacity-40"
        aria-hidden
      />

      <div className="relative z-10 max-w-[1400px] mx-auto">
        <div className="max-w-3xl">
          {/* Terminal prompt */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="font-mono text-sm mb-12 p-6"
            style={{
              backgroundColor: 'var(--tc-surface)',
              border: '1px solid var(--tc-border)',
            }}
          >
            <div className="flex items-center gap-3 mb-4 pb-3" style={{ borderBottom: '1px solid var(--tc-border)' }}>
              <span className="data-label">TERMINAL</span>
              <span className="font-mono text-[9px]" style={{ color: 'var(--tc-text-dim)' }}>verixos-cli v2.1.0</span>
            </div>
            <div style={{ color: 'var(--tc-text-muted)' }}>
              <span className="text-accent">$</span>{' '}
              <span style={{ color: 'var(--tc-text-secondary)' }}>verixos init</span>{' '}
              --orbit LEO --altitude 408 --inclination 51.64
            </div>
            <div className="mt-1" style={{ color: 'var(--tc-text-muted)' }}>
              <span className="text-accent">$</span>{' '}
              <span style={{ color: 'var(--tc-text-secondary)' }}>verixos run</span>{' '}
              --type transient --duration 5400 --timestep adaptive
            </div>
            <div className="mt-1" style={{ color: 'var(--tc-text-muted)' }}>
              <span className="text-accent">$</span>{' '}
              <span style={{ color: 'var(--tc-text-secondary)' }}>verixos export</span>{' '}
              --format csv --nodes all
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className="status-dot" />
              <span style={{ color: 'var(--tc-text-muted)' }}>
                Analysis complete. 147 nodes solved. Max temp: 142.3°C (SOLAR_PANEL_PY)
              </span>
            </div>
          </motion.div>

          {/* CTA content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <h2 className="font-mono font-bold text-display-lg tracking-tight" style={{ color: 'var(--tc-text)' }}>
              Start simulating
              <br />
              <span className="text-accent">in minutes</span>
            </h2>
            <p
              className="mt-4 max-w-lg text-base leading-relaxed font-sans"
              style={{ color: 'var(--tc-text-secondary)' }}
            >
              No credit card. No install. Create your first thermal model, configure 
              orbital parameters, and run your first analysis — all in under 5 minutes.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 font-mono text-xs tracking-[0.15em] px-8 py-4 transition-all duration-200 hover:shadow-[0_0_30px_rgba(var(--tc-accent-rgb),0.3)]"
                style={{ backgroundColor: 'var(--tc-accent)', color: '#fff' }}
              >
                CREATE FREE ACCOUNT
                <span>→</span>
              </Link>
              <Link
                href="#analysis"
                className="inline-flex items-center gap-2 font-mono text-xs tracking-[0.15em] px-8 py-4 transition-colors duration-200 hover:text-accent"
                style={{ color: 'var(--tc-text-secondary)', border: '1px solid var(--tc-border)' }}
              >
                EXPLORE CAPABILITIES
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
