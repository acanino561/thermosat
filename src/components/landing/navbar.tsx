'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValueEvent, useScroll } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { Logo } from '@/components/shared/logo';
import Link from 'next/link';

const navLinks = [
  { label: 'FEATURES', href: '#features' },
  { label: 'PRICING', href: '#pricing' },
  { label: 'SIGN IN', href: '/login' },
];

function MissionClock() {
  const [time, setTime] = useState('--:--:--');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(now.toISOString().slice(11, 19));
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <span className="font-mono text-[11px] tracking-widest" style={{ color: 'var(--tc-text-muted)' }}>
      <span className="text-accent mr-1">▸</span>
      UTC {time}
    </span>
  );
}

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, 'change', (v) => {
    setScrolled(v > 60);
  });

  return (
    <>
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="fixed top-0 left-0 right-0 z-40 transition-all duration-500"
        style={{
          backgroundColor: scrolled ? 'var(--tc-base)' : 'transparent',
          borderBottom: scrolled ? '1px solid var(--tc-border)' : '1px solid transparent',
        }}
      >
        <nav className="flex items-center justify-between px-6 lg:px-10 py-3 max-w-[1400px] mx-auto">
          <Link href="/" className="shrink-0">
            <Logo size="sm" />
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="font-mono text-[11px] tracking-[0.15em] transition-colors duration-200 hover:text-accent"
                style={{ color: 'var(--tc-text-muted)' }}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-6">
            <MissionClock />
            <div className="w-px h-4" style={{ backgroundColor: 'var(--tc-border)' }} />
            <Link
              href="/login"
              className="font-mono text-[11px] tracking-[0.15em] px-4 py-2 transition-all duration-200 hover:shadow-[0_0_20px_rgba(var(--tc-accent-rgb),0.3)]"
              style={{
                backgroundColor: 'var(--tc-accent)',
                color: '#fff',
              }}
            >
              REQUEST DEMO →
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
            style={{ color: 'var(--tc-text)' }}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </nav>
      </motion.header>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-x-0 top-[52px] z-40 p-4 md:hidden"
            style={{ backgroundColor: 'var(--tc-surface)', borderBottom: '1px solid var(--tc-border)' }}
          >
            <div className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="font-mono text-xs tracking-[0.15em] py-3 px-4 transition-colors hover:text-accent"
                  style={{ color: 'var(--tc-text-muted)' }}
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <div className="mt-4 pt-4 flex flex-col gap-2" style={{ borderTop: '1px solid var(--tc-border)' }}>
                <Link
                  href="/login"
                  className="font-mono text-xs tracking-[0.15em] py-3 px-4 text-center"
                  style={{ backgroundColor: 'var(--tc-accent)', color: '#fff' }}
                >
                  REQUEST DEMO →
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
