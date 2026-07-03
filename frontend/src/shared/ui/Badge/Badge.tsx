import type { HTMLAttributes } from 'react';
import { cn } from '@/shared/lib/cn';

type BadgeVariant =
  | 'default'
  | 'primary'
  | 'success'
  | 'danger'
  | 'warning'
  | 'muted';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  /** Show a small leading dot (useful for status badges). */
  dot?: boolean;
}

const variants: Record<BadgeVariant, string> = {
  default: 'bg-surface-muted text-foreground border border-border',
  primary: 'bg-brand-100 text-brand-700 dark:bg-brand-600/20 dark:text-brand-300',
  success: 'bg-success/15 text-success',
  danger: 'bg-danger/15 text-danger',
  warning:
    'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  muted: 'bg-surface-muted text-foreground-muted',
};

const dotColors: Record<BadgeVariant, string> = {
  default: 'bg-foreground-muted',
  primary: 'bg-brand-600',
  success: 'bg-success',
  danger: 'bg-danger',
  warning: 'bg-amber-500',
  muted: 'bg-foreground-muted',
};

/** Small status/label pill. Fully themed for light + dark mode. */
export function Badge({
  className,
  variant = 'default',
  dot = false,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        variants[variant],
        className,
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn('h-1.5 w-1.5 rounded-full', dotColors[variant])}
          aria-hidden
        />
      )}
      {children}
    </span>
  );
}
