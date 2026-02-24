'use client';

import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight, Zap } from 'lucide-react';
import Link from 'next/link';

const SatelliteScene = dynamic(
  () =>
    import('@/components/three/satellite-scene').then(
      (mod) => mod.SatelliteScene,
    ),
  { ssr: false },
);

const headlineWords = 'Spacecraft Thermal Analysis. Reimagined.'.split(' ');

const hudData = [
  { label: 'SOLAR PANEL', value: '+142°C', position: 'top-[20%] left-[10%]', color: 'text-accent-orange' },
  { label: 'ANTENNA', value: '-45°C', position: 'top-[15%] right-[12%]', color: 'text-accent-cyan' },
  { label: 'BUS CORE', value: '+22°C', position: 'bottom-[35%] left-[8%]', color: 'text-green-400' },
  { label: 'RADIATOR', value: '-78°C', position: 'bottom-[30%] right-[10%]', color: 'text-accent-blue' },
];

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* 3D Background */}
      <SatelliteScene />

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-space-base/30 via-transparent to-space-base z-10" />
      <div className="absolute inset-0 bg-gradient-to-r from-space-base/50 via-transparent to-space-base/50 z-10" />

      {/* HUD floating data readouts */}
      <div className="absolute inset-0 z-20 pointer-events-none hidden lg:block">
        {hudData.map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.5 + i * 0.2, duration: 0.5 }}
            className={`absolute ${item.position}`}
          >
            <div className="glass rounded-lg px-3 py-2 text-xs font-mono">
              <div className="text-muted-foreground text-[10px] tracking-widest">{item.label}</div>
              <div className={`text-lg font-bold ${item.color}`}>{item.value}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Hero content */}
      <div className="relative z-20 max-w-5xl mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 mb-8"
        >
          <Zap className="h-3.5 w-3.5 text-accent-orange" />
          <span className="text-xs text-muted-foreground tracking-wide">
            Now in public beta — Free for individuals
          </span>
        </motion.div>

        <h1 className="font-heading text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[1.05]">
          {headlineWords.map((word, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.5 + i * 0.1,
                duration: 0.6,
                ease: [0.22, 1, 0.36, 1],
              }}
              className={`inline-block mr-[0.3em] ${
                word === 'Reimagined.' ? 'text-gradient' : ''
              }`}
            >
              {word}
            </motion.span>
          ))}
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed"
        >
          Cloud-native thermal simulation for the NewSpace era. Build models,
          run analyses, and collaborate — all from your browser. No licenses. No installs.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5, duration: 0.6 }}
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Button variant="glow" size="xl" asChild>
            <Link href="/signup" className="gap-2">
              Start Free
              <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
          <Button variant="outline" size="xl" asChild>
            <Link href="#how-it-works">See How It Works</Link>
          </Button>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2, duration: 1 }}
          className="mt-20"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="mx-auto w-6 h-10 rounded-full border-2 border-white/20 flex items-start justify-center p-2"
          >
            <motion.div className="w-1 h-2 rounded-full bg-white/40" />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
