'use client';

import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export function Logo({ className, size = 'md', showText = true }: LogoProps) {
  const iconSizes = { sm: 16, md: 20, lg: 28 };
  const textSizes = { sm: 'text-sm', md: 'text-base', lg: 'text-xl' };
  const s = iconSizes[size];

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      {/* Thermal gradient icon — abstract heat signature */}
      <svg
        width={s}
        height={s}
        viewBox="0 0 24 24"
        fill="none"
        className="shrink-0"
      >
        <rect x="2" y="2" width="20" height="20" rx="3" stroke="var(--tc-accent)" strokeWidth="1.5" fill="none" />
        <rect x="5" y="10" width="3" height="9" fill="var(--tc-accent)" opacity="0.4" />
        <rect x="9" y="6" width="3" height="13" fill="var(--tc-accent)" opacity="0.6" />
        <rect x="13" y="3" width="3" height="16" fill="var(--tc-accent)" opacity="0.8" />
        <rect x="17" y="7" width="3" height="12" fill="var(--tc-accent)" opacity="1" />
      </svg>
      {showText && (
        <span className={cn(
          'font-mono font-semibold tracking-tight',
          textSizes[size],
        )}>
          <span style={{ color: 'var(--tc-text)' }}>THERMO</span>
          <span style={{ color: 'var(--tc-accent)' }}>SAT</span>
        </span>
      )}
    </div>
  );
}
