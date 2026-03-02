'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export function Logo({ className, size = 'md', showText = true }: LogoProps) {
  const iconSizes = { sm: 20, md: 28, lg: 40 };
  const s = iconSizes[size];

  if (!showText) {
    // Icon only — square shield mark
    return (
      <Image
        src="/icon.png"
        alt="Verixos"
        width={s}
        height={s}
        className={cn('shrink-0', className)}
        priority
      />
    );
  }

  // Full wordmark logo
  return (
    <div className={cn('flex items-center', className)}>
      <Image
        src="/logo.png"
        alt="Verixos"
        width={s * 5}
        height={s}
        className="shrink-0 object-contain"
        priority
      />
    </div>
  );
}
