import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Spacecraft Thermal Analysis',
  description: 'Lumped-parameter thermal network solver for spacecraft design',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
