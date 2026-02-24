'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { Upload, Settings2, Play, ArrowRight } from 'lucide-react';

const steps = [
  {
    number: '01',
    icon: Upload,
    title: 'Import or Build',
    description:
      'Create thermal nodes visually or import from existing tools. Define your spacecraft geometry, materials, and thermal couplings.',
    color: 'text-accent-blue',
    borderColor: 'border-accent-blue/30',
    bgColor: 'bg-accent-blue/10',
  },
  {
    number: '02',
    icon: Settings2,
    title: 'Configure',
    description:
      'Set orbital parameters, boundary conditions, and heat loads. Our environment engine calculates solar, albedo, and Earth IR automatically.',
    color: 'text-accent-cyan',
    borderColor: 'border-accent-cyan/30',
    bgColor: 'bg-accent-cyan/10',
  },
  {
    number: '03',
    icon: Play,
    title: 'Simulate',
    description:
      'Run transient or steady-state analysis. Watch temperatures evolve in real-time. Export results as CSV or JSON for post-processing.',
    color: 'text-accent-orange',
    borderColor: 'border-accent-orange/30',
    bgColor: 'bg-accent-orange/10',
  },
];

export function HowItWorksSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section id="how-it-works" className="relative py-32 px-4" ref={ref}>
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <h2 className="font-heading text-4xl md:text-5xl font-bold">
            Three steps to{' '}
            <span className="text-gradient">thermal clarity</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            From model to results in minutes, not weeks.
          </p>
        </motion.div>

        <div className="relative">
          {/* Connecting line */}
          <div className="hidden md:block absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-accent-blue/20 via-accent-cyan/20 to-accent-orange/20" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            {steps.map((step, i) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 40 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.3 + i * 0.2, duration: 0.6 }}
                className="relative"
              >
                <div className={`glass rounded-2xl p-8 border ${step.borderColor} text-center`}>
                  <div className={`inline-flex p-4 rounded-xl ${step.bgColor} mb-6`}>
                    <step.icon className={`h-8 w-8 ${step.color}`} />
                  </div>
                  <div className={`text-6xl font-heading font-bold ${step.color} opacity-20 absolute top-4 right-6`}>
                    {step.number}
                  </div>
                  <h3 className="font-heading text-2xl font-semibold mb-3">
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed text-sm">
                    {step.description}
                  </p>
                </div>
                {i < steps.length - 1 && (
                  <div className="hidden md:flex absolute top-1/2 -right-6 transform -translate-y-1/2 z-10">
                    <ArrowRight className="h-5 w-5 text-muted-foreground/30" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
