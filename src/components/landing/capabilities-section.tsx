'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

const capabilities = [
  {
    id: 'solver',
    label: 'CLOUD SOLVER',
    title: 'Transient & steady-state analysis on elastic compute',
    specs: [
      { key: 'METHOD', value: 'Backward Euler / Crank-Nicolson' },
      { key: 'NODES', value: 'Unlimited (cloud-scaled)' },
      { key: 'TIMESTEP', value: 'Adaptive, sub-second capable' },
      { key: 'OUTPUT', value: 'JSON, CSV, HDF5' },
    ],
    desc: 'No local compute limits. Submit a job, get results. Scales from 10-node CubeSats to 10,000-node flagship missions.',
  },
  {
    id: 'orbit',
    label: 'ORBITAL ENGINE',
    title: 'Automatic environmental heat loads for any orbit',
    specs: [
      { key: 'ORBITS', value: 'LEO, MEO, GEO, HEO, Lunar, L-points' },
      { key: 'SOLAR', value: 'TSI + spectra per wavelength band' },
      { key: 'ALBEDO', value: 'Lat/lon resolved, seasonal' },
      { key: 'EARTH IR', value: 'Temperature-dependent, diurnal' },
    ],
    desc: 'Define orbital elements. We compute β-angle, eclipse periods, view factors, and all environmental fluxes automatically.',
  },
  {
    id: 'collab',
    label: 'COLLABORATION',
    title: 'Real-time multi-user model editing',
    specs: [
      { key: 'USERS', value: 'Unlimited concurrent' },
      { key: 'VERSIONING', value: 'Git-like model history' },
      { key: 'REVIEW', value: 'Comments, approvals, diffs' },
      { key: 'ROLLBACK', value: 'One-click restore to any state' },
      { key: 'AUTH', value: 'SSO / SAML / OAuth 2.0' },
    ],
    desc: 'No more emailing .sinda files. Your whole team edits the same model with full version history, diffs, and rollback. Every CDR traces back to the exact model state — forever.',
  },
  {
    id: 'api',
    label: 'AUTOMATION',
    title: 'Full REST API for CI/CD integration',
    specs: [
      { key: 'API', value: 'RESTful, OpenAPI 3.0 documented' },
      { key: 'CI/CD', value: 'GitHub Actions, GitLab CI, Jenkins' },
      { key: 'SDK', value: 'Python, TypeScript' },
      { key: 'WEBHOOKS', value: 'Simulation events, results' },
    ],
    desc: 'Trigger thermal margin checks in your CI pipeline — fail the build if margins are breached. Automate parametric sweeps. Connect Verixos to your systems engineering workflow via REST API and Python SDK.',
  },
  {
    id: 'materials',
    label: 'MATERIAL DATABASE',
    title: 'Curated space-qualified optical & thermal properties',
    specs: [
      { key: 'LIBRARY', value: '500+ space materials' },
      { key: 'PROPS', value: 'α, ε, k, cp, ρ, BOL/EOL' },
      { key: 'CUSTOM', value: 'Import your own properties' },
      { key: 'AGING', value: 'UV/radiation degradation models' },
    ],
    desc: 'Every material with beginning-of-life and end-of-life optical properties. Add custom materials with full property sets.',
  },
  {
    id: 'viz',
    label: 'VISUALIZATION',
    title: '3D thermal model rendering with real-time results',
    specs: [
      { key: 'RENDER', value: 'WebGL, GPU-accelerated' },
      { key: 'COLORMAP', value: 'Temperature contours, gradients' },
      { key: 'ANIMATION', value: 'Transient playback with timeline' },
      { key: 'EXPORT', value: 'PNG, SVG, interactive HTML' },
    ],
    desc: 'See your thermal model in 3D with temperature color maps updating in real-time. Scrub through transient results like a video timeline.',
  },
];

export function CapabilitiesSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });
  const bgY = useTransform(scrollYProgress, [0, 1], [40, -40]);

  return (
    <section
      id="capabilities"
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
          <span className="data-label">SECTION 02</span>
        </div>
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-16">
          <h2 className="font-mono font-bold text-display-lg tracking-tight max-w-2xl" style={{ color: 'var(--tc-text)' }}>
            Platform<br />
            <span className="text-accent">capabilities</span>
          </h2>
          <p
            className="max-w-md text-sm leading-relaxed font-sans lg:text-right"
            style={{ color: 'var(--tc-text-secondary)' }}
          >
            The only cloud-native thermal solver with git-like model history, automated orbital environments, and native CI/CD integration. No desktop installs. No emailed .sinda files. No black-box licensing.
          </p>
        </div>

        {/* Capabilities grid — 2-column with varying density */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-px" style={{ backgroundColor: 'var(--tc-border)' }}>
          {capabilities.map((cap, i) => (
            <motion.div
              key={cap.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ delay: i * 0.06, duration: 0.4 }}
              className="p-6 lg:p-8 group cursor-default"
              style={{ backgroundColor: 'var(--tc-surface)' }}
            >
              <div className="flex items-baseline justify-between mb-5">
                <span className="data-label">{cap.label}</span>
                <span className="font-mono text-[10px] tabular-nums" style={{ color: 'var(--tc-text-dim)' }}>
                  {String(i + 1).padStart(2, '0')}/{String(capabilities.length).padStart(2, '0')}
                </span>
              </div>

              <h3
                className="font-mono text-base font-semibold leading-snug mb-3"
                style={{ color: 'var(--tc-text)' }}
              >
                {cap.title}
              </h3>

              <p
                className="text-sm leading-relaxed font-sans mb-6"
                style={{ color: 'var(--tc-text-secondary)' }}
              >
                {cap.desc}
              </p>

              {/* Spec table — data-dense, monospace */}
              <div style={{ borderTop: '1px solid var(--tc-border)' }}>
                {cap.specs.map((spec) => (
                  <div
                    key={spec.key}
                    className="flex items-baseline justify-between py-2 font-mono text-xs"
                    style={{ borderBottom: '1px solid var(--tc-border-subtle)' }}
                  >
                    <span style={{ color: 'var(--tc-text-muted)' }}>{spec.key}</span>
                    <span style={{ color: 'var(--tc-text-secondary)' }}>{spec.value}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
