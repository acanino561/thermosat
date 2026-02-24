'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { Check, X, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

type CellValue = 'yes' | 'no' | 'partial' | string;

interface ComparisonRow {
  feature: string;
  thermosat: CellValue;
  thermalDesktop: CellValue;
  esatan: CellValue;
}

const rows: ComparisonRow[] = [
  { feature: 'Browser-based', thermosat: 'yes', thermalDesktop: 'no', esatan: 'no' },
  { feature: 'Real-time collaboration', thermosat: 'yes', thermalDesktop: 'no', esatan: 'no' },
  { feature: 'API access', thermosat: 'yes', thermalDesktop: 'no', esatan: 'partial' },
  { feature: 'CI/CD integration', thermosat: 'yes', thermalDesktop: 'no', esatan: 'no' },
  { feature: 'Free tier', thermosat: 'yes', thermalDesktop: 'no', esatan: 'no' },
  { feature: 'Orbital environment engine', thermosat: 'yes', thermalDesktop: 'yes', esatan: 'yes' },
  { feature: 'Transient analysis', thermosat: 'yes', thermalDesktop: 'yes', esatan: 'yes' },
  { feature: 'Material library', thermosat: 'yes', thermalDesktop: 'yes', esatan: 'yes' },
  { feature: 'Visual model builder', thermosat: 'yes', thermalDesktop: 'yes', esatan: 'partial' },
  { feature: 'Starting price', thermosat: '$0', thermalDesktop: '$15K+/yr', esatan: 'Contact' },
  { feature: 'Setup time', thermosat: '2 minutes', thermalDesktop: '1-2 weeks', esatan: '2-4 weeks' },
];

function CellIcon({ value }: { value: CellValue }) {
  if (value === 'yes') {
    return <Check className="h-5 w-5 text-green-400" />;
  }
  if (value === 'no') {
    return <X className="h-5 w-5 text-red-400/60" />;
  }
  if (value === 'partial') {
    return <Minus className="h-5 w-5 text-yellow-400/60" />;
  }
  return <span className="text-sm font-mono text-muted-foreground">{value}</span>;
}

export function ComparisonSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section id="compare" className="relative py-32 px-4" ref={ref}>
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="font-heading text-4xl md:text-5xl font-bold">
            How we <span className="text-gradient">stack up</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            The honest comparison. We&apos;re building something fundamentally different.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="glass rounded-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="grid grid-cols-4 gap-4 px-6 py-4 border-b border-white/10">
            <div className="text-sm text-muted-foreground font-medium">Feature</div>
            <div className="text-sm font-semibold text-center text-gradient">ThermoSat</div>
            <div className="text-sm text-muted-foreground text-center">Thermal Desktop</div>
            <div className="text-sm text-muted-foreground text-center">ESATAN</div>
          </div>

          {/* Rows */}
          {rows.map((row, i) => (
            <div
              key={row.feature}
              className={cn(
                'grid grid-cols-4 gap-4 px-6 py-3 items-center transition-colors hover:bg-white/[0.02]',
                i < rows.length - 1 && 'border-b border-white/5',
              )}
            >
              <div className="text-sm text-foreground">{row.feature}</div>
              <div className="flex justify-center">
                <CellIcon value={row.thermosat} />
              </div>
              <div className="flex justify-center">
                <CellIcon value={row.thermalDesktop} />
              </div>
              <div className="flex justify-center">
                <CellIcon value={row.esatan} />
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
