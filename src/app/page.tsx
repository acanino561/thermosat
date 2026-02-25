'use client';

import { LenisProvider } from '@/components/shared/lenis-provider';
import { CursorGlow } from '@/components/shared/cursor-glow';
import { GrainOverlay } from '@/components/shared/grain-overlay';
import { Navbar } from '@/components/landing/navbar';
import { HeroSection } from '@/components/landing/hero-section';
import { TelemetryStrip } from '@/components/landing/telemetry-strip';
import { EnergyBalanceSection } from '@/components/landing/energy-balance-section';
import { CapabilitiesSection } from '@/components/landing/capabilities-section';
import { SpecComparison } from '@/components/landing/spec-comparison';
import { PricingSection } from '@/components/landing/pricing-section';
import { CtaSection } from '@/components/landing/cta-section';
import { Footer } from '@/components/landing/footer';
import { PaletteSwitcher } from '@/components/landing/palette-switcher';

export default function LandingPage() {
  return (
    <LenisProvider>
      <CursorGlow />
      <GrainOverlay />
      <Navbar />
      <main>
        <HeroSection />
        <TelemetryStrip />
        <EnergyBalanceSection />
        <CapabilitiesSection />
        <SpecComparison />
        <PricingSection />
        <CtaSection />
      </main>
      <Footer />
      <PaletteSwitcher />
    </LenisProvider>
  );
}
