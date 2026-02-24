'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, Rocket } from 'lucide-react';
import Link from 'next/link';

export function CtaSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section className="relative py-32 px-4" ref={ref}>
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="relative glass rounded-3xl p-12 md:p-16 text-center overflow-hidden"
        >
          {/* Gradient background accent */}
          <div className="absolute inset-0 bg-gradient-to-br from-accent-blue/10 via-transparent to-accent-orange/10" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-accent-blue/10 rounded-full blur-3xl" />

          <div className="relative z-10">
            <motion.div
              initial={{ scale: 0 }}
              animate={isInView ? { scale: 1 } : {}}
              transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
              className="inline-flex p-4 rounded-2xl bg-accent-blue/10 mb-6"
            >
              <Rocket className="h-8 w-8 text-accent-blue" />
            </motion.div>

            <h2 className="font-heading text-4xl md:text-5xl font-bold mb-4">
              Start simulating in{' '}
              <span className="text-gradient">minutes</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
              No credit card required. No installs. Create your first thermal model
              in under 5 minutes.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button variant="glow" size="xl" asChild>
                <Link href="/signup" className="gap-2">
                  Create Free Account
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button variant="ghost" size="xl" asChild>
                <Link href="#features">Explore Features</Link>
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
