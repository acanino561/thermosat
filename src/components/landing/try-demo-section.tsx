'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

export function TryDemoSection() {
  return (
    <section
      className="relative py-24 lg:py-32 px-6 lg:px-10 overflow-hidden"
      style={{ borderTop: '1px solid var(--tc-border)' }}
    >
      <div className="absolute inset-0 eng-grid pointer-events-none opacity-40" aria-hidden />

      <div className="relative z-10 max-w-[1400px] mx-auto">
        <div className="max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <span className="data-label">TRY IT NOW</span>

            <h2 className="mt-6 font-mono font-bold text-display-lg tracking-tight" style={{ color: 'var(--tc-text)' }}>
              Explore the demo
              <br />
              <span className="text-accent">no account needed</span>
            </h2>

            <p
              className="mt-4 max-w-lg text-base leading-relaxed font-sans"
              style={{ color: 'var(--tc-text-secondary)' }}
            >
              A pre-built 3U CubeSat thermal model appears on first login.
              Run simulations, explore orbit playback, and generate PDF reports —
              all from your browser.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link
                href="/auth/signin"
                className="inline-flex items-center gap-2 font-mono text-xs tracking-[0.15em] px-8 py-4 transition-all duration-200 hover:shadow-[0_0_30px_rgba(var(--tc-accent-rgb),0.3)]"
                style={{ backgroundColor: 'var(--tc-accent)', color: '#fff' }}
              >
                EXPLORE THE DEMO
                <span>→</span>
              </Link>
              <Link
                href="#features"
                className="inline-flex items-center gap-2 font-mono text-xs tracking-[0.15em] px-8 py-4 transition-colors duration-200 hover:text-accent"
                style={{ color: 'var(--tc-text-secondary)', border: '1px solid var(--tc-border)' }}
              >
                VIEW CAPABILITIES
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
