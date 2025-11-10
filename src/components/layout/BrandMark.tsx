'use client';

import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const ICON_SRC = 'https://img.icons8.com/nolan/500/warning-shield.png';

interface BrandMarkProps {
  className?: string;
  showTagline?: boolean;
  size?: 'sm' | 'md';
  variant?: 'dark' | 'light';
  href?: string | null;
}

const variantStyles = {
  dark: {
    wrapper: 'text-white',
    tagline: 'text-white/50',
    iconWrapper:
      'border-white/30 bg-white/10 shadow-[0_18px_60px_rgba(50,14,233,0.35)]',
    glow: 'bg-white/60',
  },
  light: {
    wrapper: 'text-slate-900',
    tagline: 'text-slate-400',
    iconWrapper:
      'border-slate-200 bg-white shadow-[0_10px_40px_rgba(50,23,142,0.08)]',
    glow: 'bg-cyan-200/60',
  },
};

export function BrandMark({
  className,
  showTagline = true,
  size = 'md',
  variant = 'dark',
  href = '/dashboard',
}: BrandMarkProps) {
  const textScale = size === 'sm' ? 'text-2xl' : 'text-3xl';
  const iconSize = size === 'sm' ? 'h-10 w-10' : 'h-12 w-12';
  const palette = variantStyles[variant];
  const wrapperClasses = cn(
    'flex items-center gap-4',
    palette.wrapper,
    className
  );

  const content = (
    <>
      <div
        className={cn(
          'relative rounded-3xl p-2',
          palette.iconWrapper,
          iconSize
        )}
      >
        <Image
          src={ICON_SRC}
          alt="FormBlocker shield icon"
          fill
          sizes="48px"
          className="object-contain"
        />
        <span
          className={cn(
            'pointer-events-none absolute inset-0 -z-10 rounded-[28px] blur-[18px]',
            palette.glow
          )}
          aria-hidden
        />
      </div>
      <div className="space-y-1">
        <p
          className={cn(
            'font-display uppercase leading-none tracking-[0.08em]',
            textScale
          )}
        >
          FormBlocker
        </p>
        {showTagline && (
          <p
            className={cn(
              'text-[10px] uppercase tracking-[0.5em]',
              palette.tagline
            )}
          >
            Form Defense
          </p>
        )}
      </div>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={wrapperClasses}
        aria-label="FormBlocker dashboard"
      >
        {content}
      </Link>
    );
  }

  return (
    <div className={wrapperClasses} aria-label="FormBlocker brand">
      {content}
    </div>
  );
}
