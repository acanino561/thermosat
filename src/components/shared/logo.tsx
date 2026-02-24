'use client';

import { Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

const sizeMap = {
  sm: 'h-5 w-5',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
};

const textSizeMap = {
  sm: 'text-lg',
  md: 'text-xl',
  lg: 'text-2xl',
};

export function Logo({ className, size = 'md', showText = true }: LogoProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="relative">
        <Flame className={cn(sizeMap[size], 'text-accent-orange')} />
        <div className="absolute inset-0 blur-sm">
          <Flame className={cn(sizeMap[size], 'text-accent-orange opacity-50')} />
        </div>
      </div>
      {showText && (
        <span className={cn('font-heading font-bold tracking-tight', textSizeMap[size])}>
          <span className="text-foreground">Thermo</span>
          <span className="text-gradient">Sat</span>
        </span>
      )}
    </div>
  );
}
