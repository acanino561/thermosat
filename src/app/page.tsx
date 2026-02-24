'use client';

import { LenisProvider } from '@/components/shared/lenis-provider';
import { CursorGlow } from '@/components/shared/cursor-glow';
import { GrainOverlay } from '@/components/shared/grain-overlay';
import { Navbar } from '@/components/landing/navbar';
import { HeroSection } from '@/components/landing/hero-section';
import { ProblemSection } from '@/components/landing/problem-section';
import { FeaturesSection } from '@/components/landing/features-section';
import { HowItWorksSection } from '@/components/landing/how-it-works-section';
import { PricingSection } from '@/components/landing/pricing-section';
import { ComparisonSection } from '@/components/landing/comparison-section';
import { TestimonialsSection } from '@/components/landing/testimonials-section';
import { CtaSection } from '@/components/landing/cta-section';
import { Footer } from '@/components/landing/footer';

export default function LandingPage() {
  return (
    <LenisProvider>
      <CursorGlow />
      <GrainOverlay />
      <Navbar />
      <main>
        <HeroSection />
        <ProblemSection />
        <FeaturesSection />
        <HowItWorksSection />
        <PricingSection />
        <ComparisonSection />
        <TestimonialsSection />
        <CtaSection />
      </main>
      <Footer />
    </LenisProvider>
  );
}
