'use client';

import { LenisProvider } from '@/components/shared/lenis-provider';
import { CursorGlow } from '@/components/shared/cursor-glow';
import { GrainOverlay } from '@/components/shared/grain-overlay';
import { Navbar } from '@/components/landing/navbar';
import { HeroSection } from '@/components/landing/hero-section';
import { TelemetryStrip } from '@/components/landing/telemetry-strip';
import { EnergyBalanceSection } from '@/components/landing/energy-balance-section';
import { FeaturesSection } from '@/components/landing/features-section';
import { CapabilitiesSection } from '@/components/landing/capabilities-section';
import { SpecComparison } from '@/components/landing/spec-comparison';
import { VvBadgeSection } from '@/components/landing/vv-badge-section';
import { DemoVideoSection } from '@/components/landing/demo-video-section';
import { PricingSection } from '@/components/landing/pricing-section';
import { TryDemoSection } from '@/components/landing/try-demo-section';
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
        <FeaturesSection />
        <CapabilitiesSection />
        <SpecComparison />
        <VvBadgeSection />
        <DemoVideoSection />
        <PricingSection />
        <TryDemoSection />
      </main>
      <Footer />
      <PaletteSwitcher />
    </LenisProvider>
  );
}
