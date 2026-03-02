import type { Metadata } from 'next';
import { IBM_Plex_Mono, IBM_Plex_Sans } from 'next/font/google';
import { TooltipProvider } from '@/components/ui/tooltip';
import './globals.css';

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-plex-mono',
  display: 'swap',
});

const plexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-plex-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Verixos — Spacecraft Thermal Analysis Software',
    template: '%s | Verixos',
  },
  description:
    'Browser-native spacecraft thermal analysis. Physics-accurate RK4 solver, orbit playback with shadows, What If instant replay. 10/10 V&V benchmarks.',
  keywords: [
    'spacecraft thermal analysis',
    'satellite thermal modeling',
    'online thermal desktop alternative',
    'CubeSat thermal analysis',
    'spacecraft thermal software',
  ],
  icons: {
    icon: '/favicon.ico',
    apple: '/icon.png',
  },
  openGraph: {
    title: 'Verixos — Spacecraft Thermal Analysis Software',
    description: 'Physics-accurate spacecraft thermal analysis in your browser.',
    url: 'https://verixos.com',
    siteName: 'Verixos',
    images: [{ url: '/logo.png', width: 3808, height: 1120, alt: 'Verixos' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Verixos — Spacecraft Thermal Analysis Software',
    description: 'Browser-native spacecraft thermal analysis. RK4 solver. 10/10 V&V benchmarks.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      data-theme="mission-control"
      className={`${plexMono.variable} ${plexSans.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen font-sans antialiased">
        <TooltipProvider delayDuration={200}>
          {children}
        </TooltipProvider>
      </body>
    </html>
  );
}
