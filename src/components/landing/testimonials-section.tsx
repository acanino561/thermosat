'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const testimonials = [
  {
    quote: 'We switched from a legacy tool and cut our thermal analysis turnaround from 2 weeks to 2 days. The collaborative features alone justify the switch.',
    name: 'Dr. Sarah Chen',
    role: 'Lead Thermal Engineer',
    company: 'Apex Satellite Systems',
    initials: 'SC',
  },
  {
    quote: 'Finally, a thermal analysis tool that feels like it was built this decade. The API integration lets us run thermal checks in our CI pipeline automatically.',
    name: 'James Nakamura',
    role: 'Systems Engineer',
    company: 'NovaStar Aerospace',
    initials: 'JN',
  },
  {
    quote: 'As a university lab, we could never afford legacy tools. ThermoSat\'s free tier lets our students learn real thermal analysis workflows from day one.',
    name: 'Prof. Maria Rodriguez',
    role: 'Aerospace Engineering Dept.',
    company: 'MIT',
    initials: 'MR',
  },
];

export function TestimonialsSection() {
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
            Trusted by <span className="text-gradient">thermal engineers</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Engineers at startups, agencies, and universities are making the switch.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.2 + i * 0.1, duration: 0.5 }}
              className="glass rounded-xl p-6 flex flex-col"
            >
              <p className="text-muted-foreground leading-relaxed flex-1 mb-6">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="flex items-center gap-3 pt-4 border-t border-white/10">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-gradient-to-br from-accent-blue to-accent-cyan text-white text-xs font-semibold">
                    {t.initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="text-sm font-semibold">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.role}, {t.company}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
