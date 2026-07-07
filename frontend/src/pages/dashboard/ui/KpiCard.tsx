import type { KeyboardEvent, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

import { Card, Skeleton } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';

export interface KpiCardProps {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  /** Optional smaller line under the value (e.g. a count or period). */
  sub?: ReactNode;
  /** Tailwind classes for the icon chip (bg + text), theme-aware. */
  accent: string;
  loading?: boolean;
  /** When set, the whole tile becomes an accessible button (click + keyboard). */
  onClick?: () => void;
}

/**
 * Compact KPI tile: an accent icon chip beside a label + big value.
 * Labels wrap (up to two lines) instead of truncating so long uppercase
 * titles stay fully readable at laptop widths. With `onClick` the tile is a
 * keyboard-accessible button with hover elevation and a focus ring.
 * Flawless from 320px (two-up grid) and fully themed for light + dark mode.
 */
export function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
  loading = false,
  onClick,
}: KpiCardProps) {
  const interactive = Boolean(onClick);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!onClick) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <Card
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={interactive ? label : undefined}
      onClick={onClick}
      onKeyDown={interactive ? handleKeyDown : undefined}
      className={cn(
        'flex items-start gap-3',
        interactive &&
          'cursor-pointer transition-all duration-150 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      )}
    >
      <span
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
          accent,
        )}
        aria-hidden
      >
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 break-words text-[11px] font-medium uppercase leading-snug tracking-wide text-foreground-muted">
          {label}
        </p>
        {loading ? (
          <Skeleton className="mt-1.5 h-6 w-20" />
        ) : (
          <p className="mt-0.5 break-words text-lg font-semibold leading-snug text-foreground sm:text-xl">
            {value}
          </p>
        )}
        {sub && !loading && (
          <p className="mt-0.5 line-clamp-2 break-words text-xs text-foreground-muted">
            {sub}
          </p>
        )}
      </div>
    </Card>
  );
}
