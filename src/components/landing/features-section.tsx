'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import {
  Cloud,
  Users,
  Globe,
  Database,
  Layers,
  Code2,
} from 'lucide-react';

const features = [
  {
    icon: Cloud,
    title: 'Cloud-Native Solver',
    description: 'Run thermal simulations on scalable cloud infrastructure. No local compute limits.',
    gradient: 'from-blue-500 to-cyan-500',
    glowColor: 'group-hover:shadow-blue-500/20',
  },
  {
    icon: Users,
    title: 'Real-Time Collaboration',
    description: 'Work together on thermal models simultaneously. See changes as they happen.',
    gradient: 'from-violet-500 to-purple-500',
    glowColor: 'group-hover:shadow-violet-500/20',
  },
  {
    icon: Globe,
    title: 'Orbital Environment Engine',
    description: 'Automatic solar flux, albedo, and Earth IR calculations for any orbit.',
    gradient: 'from-orange-500 to-amber-500',
    glowColor: 'group-hover:shadow-orange-500/20',
  },
  {
    icon: Database,
    title: 'Material Database',
    description: 'Curated library of space-qualified materials with full optical and thermal properties.',
    gradient: 'from-emerald-500 to-green-500',
    glowColor: 'group-hover:shadow-emerald-500/20',
  },
  {
    icon: Layers,
    title: 'Visual Model Builder',
    description: 'Build thermal networks visually. Drag-and-drop nodes and conductors on an interactive canvas.',
    gradient: 'from-rose-500 to-pink-500',
    glowColor: 'group-hover:shadow-rose-500/20',
  },
  {
    icon: Code2,
    title: 'API & CI/CD Integration',
    description: 'Full REST API for automation. Run thermal checks in your CI pipeline.',
    gradient: 'from-cyan-500 to-teal-500',
    glowColor: 'group-hover:shadow-cyan-500/20',
  },
];

export function FeaturesSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section id="features" className="relative py-32 px-4" ref={ref}>
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="font-heading text-4xl md:text-5xl font-bold">
            Everything you need.{' '}
            <span className="text-gradient">Nothing you don&apos;t.</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Purpose-built for spacecraft thermal engineers who want modern tools, not legacy baggage.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.2 + i * 0.08, duration: 0.5 }}
              className={`group glass rounded-xl p-6 cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-xl ${feature.glowColor}`}
            >
              <div
                className={`inline-flex p-3 rounded-lg bg-gradient-to-br ${feature.gradient} mb-4`}
              >
                <feature.icon className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-heading text-xl font-semibold mb-2">
                {feature.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed text-sm">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
