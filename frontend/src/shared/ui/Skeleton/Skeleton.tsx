import type { HTMLAttributes } from 'react';
import { cn } from '@/shared/lib/cn';

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  /** Render as a full-width text line with rounded ends. */
  variant?: 'block' | 'text' | 'circle';
}

/**
 * Loading placeholder. Uses the surface-muted token so it reads correctly in
 * both light and dark mode. Compose several to build skeleton screens.
 */
export function Skeleton({
  className,
  variant = 'block',
  ...props
}: SkeletonProps) {
  return (
    <div
      aria-hidden
      className={cn(
        'animate-pulse bg-surface-muted',
        variant === 'text' && 'h-4 w-full rounded',
        variant === 'circle' && 'rounded-full',
        variant === 'block' && 'rounded-lg',
        className,
      )}
      {...props}
    />
  );
}
