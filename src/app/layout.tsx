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
    default: 'Verixos — Spacecraft Thermal Analysis',
    template: '%s | Verixos',
  },
  description:
    'Professional thermal analysis software for spacecraft engineers. 3D CAD import, orbital solver, V&V benchmarks.',
  openGraph: {
    title: 'Verixos — Spacecraft Thermal Analysis',
    description: 'Professional thermal analysis software for spacecraft engineers. 3D CAD import, orbital solver, V&V benchmarks.',
    type: 'website',
  },
  keywords: [
    'spacecraft',
    'thermal analysis',
    'thermal desktop',
    'satellite',
    'space engineering',
    'thermal simulation',
  ],
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
