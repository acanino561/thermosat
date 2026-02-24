'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { AlertTriangle, Clock, DollarSign, Lock } from 'lucide-react';

const problems = [
  {
    icon: DollarSign,
    title: '$50K+ per seat',
    description: 'Legacy tools charge enterprise-only pricing, locking out startups and universities.',
  },
  {
    icon: Clock,
    title: 'Weeks to set up',
    description: 'Installation, licensing servers, training — before you even build your first model.',
  },
  {
    icon: Lock,
    title: 'No collaboration',
    description: 'Desktop-only tools mean emailing files back and forth. Version control? What\'s that?',
  },
  {
    icon: AlertTriangle,
    title: 'Stuck in the 90s',
    description: 'Interfaces designed decades ago. No API, no CI/CD, no modern engineering workflow.',
  },
];

export function ProblemSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section className="relative py-32 px-4" ref={ref}>
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="font-heading text-4xl md:text-5xl font-bold">
            Legacy tools weren&apos;t built for the{' '}
            <span className="text-gradient-warm">NewSpace</span> era
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            The space industry is moving faster than ever. Your thermal analysis tools should keep up.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {problems.map((problem, i) => (
            <motion.div
              key={problem.title}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.2 + i * 0.1, duration: 0.5 }}
              className="glass rounded-xl p-6 group hover:border-accent-orange/30 transition-all duration-300"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-accent-orange/10 text-accent-orange group-hover:bg-accent-orange/20 transition-colors">
                  <problem.icon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-heading text-xl font-semibold mb-2">{problem.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{problem.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
