'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const themes = [
  { id: 'mission-control', label: 'MISSION CTRL', color: '#FF3D00', indicator: '●' },
  { id: 'thermal-ir', label: 'THERMAL IR', color: '#FF6B00', indicator: '●' },
  { id: 'cryogenic', label: 'CRYOGENIC', color: '#00E5FF', indicator: '●' },
  { id: 'clean-room', label: 'CLEAN ROOM', color: '#FF3D00', indicator: '○' },
] as const;

type ThemeId = typeof themes[number]['id'];
const STORAGE_KEY = 'verixos-theme';

export function PaletteSwitcher() {
  const [activeTheme, setActiveTheme] = useState<ThemeId>('mission-control');
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(STORAGE_KEY) as ThemeId | null;
    if (stored && themes.some(t => t.id === stored)) {
      setActiveTheme(stored);
      document.documentElement.setAttribute('data-theme', stored);
    }
  }, []);

  const selectTheme = useCallback((id: ThemeId) => {
    setActiveTheme(id);
    document.documentElement.setAttribute('data-theme', id);
    localStorage.setItem(STORAGE_KEY, id);
    setIsOpen(false);
  }, []);

  if (!mounted) return null;

  const current = themes.find(t => t.id === activeTheme)!;

  return (
    <div className="fixed bottom-6 left-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-12 left-0 min-w-[160px] py-1"
            style={{
              backgroundColor: 'var(--tc-surface)',
              border: '1px solid var(--tc-border)',
            }}
          >
            <div className="px-3 py-1.5">
              <span className="data-label">PALETTE</span>
            </div>
            {themes.map((theme) => (
              <button
                key={theme.id}
                onClick={() => selectTheme(theme.id)}
                className="w-full flex items-center gap-3 px-3 py-2 transition-all duration-150 cursor-pointer"
                style={{
                  backgroundColor: activeTheme === theme.id ? 'var(--tc-elevated)' : 'transparent',
                }}
                onMouseEnter={(e) => {
                  if (activeTheme !== theme.id) {
                    e.currentTarget.style.backgroundColor = 'var(--tc-elevated)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTheme !== theme.id) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{
                    backgroundColor: theme.color,
                    boxShadow: activeTheme === theme.id ? `0 0 8px ${theme.color}80` : 'none',
                  }}
                />
                <span
                  className="font-mono text-[10px] tracking-[0.12em]"
                  style={{
                    color: activeTheme === theme.id ? 'var(--tc-text)' : 'var(--tc-text-muted)',
                  }}
                >
                  {theme.label}
                </span>
                {activeTheme === theme.id && (
                  <span
                    className="ml-auto font-mono text-[10px]"
                    style={{ color: theme.color }}
                  >
                    ◄
                  </span>
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 transition-all duration-200 cursor-pointer group"
        style={{
          backgroundColor: 'var(--tc-surface)',
          border: '1px solid var(--tc-border)',
        }}
        aria-label="Change color theme"
      >
        <div
          className="w-2 h-2 rounded-full transition-shadow duration-200"
          style={{
            backgroundColor: current.color,
            boxShadow: `0 0 6px ${current.color}60`,
          }}
        />
        <span
          className="font-mono text-[9px] tracking-[0.12em] transition-colors duration-200"
          style={{ color: 'var(--tc-text-muted)' }}
        >
          {current.label}
        </span>
      </button>
    </div>
  );
}
