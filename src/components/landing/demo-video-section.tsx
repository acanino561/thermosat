'use client';

import { motion } from 'framer-motion';
import { Play } from 'lucide-react';

export function DemoVideoSection() {
  return (
    <section
      id="demo"
      className="relative py-24 lg:py-32 px-6 lg:px-10"
      style={{ borderTop: '1px solid var(--tc-border)' }}
    >
      <div className="max-w-[1400px] mx-auto">
        <div className="mb-6">
          <span className="data-label">DEMONSTRATION</span>
        </div>
        <h2 className="font-mono font-bold text-display-lg tracking-tight mb-12" style={{ color: 'var(--tc-text)' }}>
          See Verixos <span className="text-accent">in action</span>
        </h2>

        {/* TODO: replace with actual video embed */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5 }}
          className="relative aspect-video max-w-4xl mx-auto flex items-center justify-center cursor-pointer group"
          style={{
            backgroundColor: 'var(--tc-surface)',
            border: '1px solid var(--tc-border)',
          }}
        >
          <div className="flex flex-col items-center gap-4">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 group-hover:shadow-[0_0_30px_rgba(var(--tc-accent-rgb),0.3)]"
              style={{ border: '2px solid var(--tc-accent)' }}
            >
              <Play className="w-6 h-6 ml-1 text-accent" />
            </div>
            <span className="font-mono text-[11px] tracking-[0.15em]" style={{ color: 'var(--tc-text-muted)' }}>
              COMING SOON
            </span>
          </div>

          {/* Corner markers */}
          <div className="absolute top-3 left-3 w-4 h-4" style={{ borderTop: '1px solid var(--tc-accent)', borderLeft: '1px solid var(--tc-accent)', opacity: 0.4 }} />
          <div className="absolute top-3 right-3 w-4 h-4" style={{ borderTop: '1px solid var(--tc-accent)', borderRight: '1px solid var(--tc-accent)', opacity: 0.4 }} />
          <div className="absolute bottom-3 left-3 w-4 h-4" style={{ borderBottom: '1px solid var(--tc-accent)', borderLeft: '1px solid var(--tc-accent)', opacity: 0.4 }} />
          <div className="absolute bottom-3 right-3 w-4 h-4" style={{ borderBottom: '1px solid var(--tc-accent)', borderRight: '1px solid var(--tc-accent)', opacity: 0.4 }} />
        </motion.div>

        <p
          className="mt-6 text-center text-sm font-sans"
          style={{ color: 'var(--tc-text-muted)' }}
        >
          2-minute walkthrough — orbit playback, What If sliders, and PDF export
        </p>
      </div>
    </section>
  );
}
