'use client';

import { Logo } from '@/components/shared/logo';
import Link from 'next/link';

const footerLinks = {
  PRODUCT: [
    { label: 'Capabilities', href: '#capabilities' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'Specifications', href: '#specs' },
    { label: 'Changelog', href: '#' },
    { label: 'Roadmap', href: '#' },
  ],
  RESOURCES: [
    { label: 'Documentation', href: '#' },
    { label: 'API Reference', href: '#' },
    { label: 'Tutorials', href: '#' },
    { label: 'Material Database', href: '#' },
    { label: 'Community', href: '#' },
  ],
  COMPANY: [
    { label: 'About', href: '#' },
    { label: 'Careers', href: '#' },
    { label: 'Contact', href: '#' },
    { label: 'Privacy', href: '#' },
    { label: 'Terms', href: '#' },
  ],
};

export function Footer() {
  return (
    <footer style={{ borderTop: '1px solid var(--tc-border)' }}>
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-16">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Logo size="md" />
            <p
              className="mt-4 text-sm leading-relaxed font-sans max-w-sm"
              style={{ color: 'var(--tc-text-secondary)' }}
            >
              Cloud-native spacecraft thermal analysis. 
              Engineering-grade accuracy. Modern developer experience.
            </p>
            <div className="mt-6 font-mono text-[10px] tracking-[0.1em]" style={{ color: 'var(--tc-text-muted)' }}>
              <span className="text-accent">▸</span> Built by thermal engineers, for thermal engineers
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <span className="data-label">{category}</span>
              <ul className="mt-4 space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm font-sans transition-colors duration-200 hover:text-accent"
                      style={{ color: 'var(--tc-text-secondary)' }}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div
          className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pt-8"
          style={{ borderTop: '1px solid var(--tc-border)' }}
        >
          <span className="font-mono text-[10px] tracking-[0.1em]" style={{ color: 'var(--tc-text-muted)' }}>
            © 2025 VERIXOS. ALL RIGHTS RESERVED.
          </span>
          <div className="flex items-center gap-6">
            {['GitHub', 'Twitter', 'LinkedIn'].map((name) => (
              <a
                key={name}
                href="#"
                className="font-mono text-[10px] tracking-[0.1em] transition-colors duration-200 hover:text-accent"
                style={{ color: 'var(--tc-text-muted)' }}
              >
                {name.toUpperCase()}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
