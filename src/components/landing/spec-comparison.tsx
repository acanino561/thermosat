'use client';

import { motion } from 'framer-motion';
import { useRef } from 'react';

interface SpecRow {
  feature: string;
  verixos: string;
  legacy: string;
  highlight?: boolean;
}

const specs: SpecRow[] = [
  { feature: 'DEPLOYMENT', verixos: 'Browser — instant', legacy: 'Desktop install — weeks', highlight: true },
  { feature: 'LICENSING', verixos: 'Free tier available', legacy: '$15K–$50K+ / seat / yr', highlight: true },
  { feature: 'SETUP TIME', verixos: '< 2 minutes', legacy: '1–4 weeks' },
  { feature: 'COLLABORATION', verixos: 'Real-time multi-user', legacy: 'Email files' },
  { feature: 'API ACCESS', verixos: 'REST API + SDKs', legacy: 'None or limited' },
  { feature: 'CI/CD', verixos: 'Native integration', legacy: 'Not available' },
  { feature: 'ORBIT ENGINE', verixos: 'Built-in, automatic', legacy: 'Built-in' },
  { feature: 'TRANSIENT', verixos: 'Backward Euler / CN', legacy: 'Available' },
  { feature: 'MATERIAL DB', verixos: '500+ w/ BOL/EOL', legacy: 'Varies' },
  { feature: 'VISUAL BUILDER', verixos: 'Drag & drop canvas', legacy: 'Varies' },
  { feature: 'VERSION CONTROL', verixos: 'Git-like history', legacy: 'Manual backups' },
  { feature: 'DATA EXPORT', verixos: 'JSON, CSV, HDF5', legacy: 'Proprietary formats' },
];

export function SpecComparison() {
  const sectionRef = useRef<HTMLElement>(null);

  return (
    <section
      id="specs"
      ref={sectionRef}
      className="relative py-24 lg:py-32 px-6 lg:px-10"
      style={{ borderTop: '1px solid var(--tc-border)' }}
    >
      <div className="max-w-[1400px] mx-auto">
        {/* Section header */}
        <div className="mb-6">
          <span className="data-label">SECTION 03</span>
        </div>
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-16">
          <h2 className="font-mono font-bold text-display-lg tracking-tight max-w-2xl" style={{ color: 'var(--tc-text)' }}>
            Technical<br />
            <span className="text-accent">specifications</span>
          </h2>
          <p
            className="max-w-md text-sm leading-relaxed font-sans lg:text-right"
            style={{ color: 'var(--tc-text-secondary)' }}
          >
            An honest comparison with legacy thermal analysis tools. 
            We complement, not compete — but we&apos;re building something fundamentally different.
          </p>
        </div>

        {/* Spec sheet table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5 }}
          style={{ border: '1px solid var(--tc-border)' }}
        >
          {/* Table header */}
          <div
            className="grid grid-cols-[1fr_1fr_1fr] font-mono text-[10px] tracking-[0.15em] p-4"
            style={{ backgroundColor: 'var(--tc-elevated)', borderBottom: '1px solid var(--tc-border)' }}
          >
            <span style={{ color: 'var(--tc-text-muted)' }}>PARAMETER</span>
            <span className="text-accent">VERIXOS</span>
            <span style={{ color: 'var(--tc-text-muted)' }}>LEGACY TOOLS</span>
          </div>

          {/* Table rows */}
          {specs.map((row, i) => (
            <motion.div
              key={row.feature}
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.03, duration: 0.3 }}
              className="grid grid-cols-[1fr_1fr_1fr] font-mono text-xs py-3 px-4 transition-colors duration-150"
              style={{
                borderBottom: i < specs.length - 1 ? '1px solid var(--tc-border-subtle)' : 'none',
                backgroundColor: row.highlight ? 'rgba(var(--tc-accent-rgb), 0.03)' : 'transparent',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--tc-elevated)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = row.highlight ? 'rgba(var(--tc-accent-rgb), 0.03)' : 'transparent';
              }}
            >
              <span style={{ color: 'var(--tc-text-muted)' }}>{row.feature}</span>
              <span style={{ color: row.highlight ? 'var(--tc-accent)' : 'var(--tc-text)' }}>
                {row.verixos}
              </span>
              <span style={{ color: 'var(--tc-text-muted)' }}>{row.legacy}</span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
