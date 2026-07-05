import type { ReactNode } from 'react';
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
}

/**
 * Compact KPI tile: an accent icon chip beside a label + big value.
 * Flawless from 320px (two-up grid) and fully themed for light + dark mode.
 */
export function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
  loading = false,
}: KpiCardProps) {
  return (
    <Card className="flex items-start gap-3">
      <span
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
          accent,
        )}
        aria-hidden
      >
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium uppercase tracking-wide text-foreground-muted">
          {label}
        </p>
        {loading ? (
          <Skeleton className="mt-1.5 h-6 w-20" />
        ) : (
          <p className="mt-0.5 truncate text-lg font-semibold text-foreground sm:text-xl">
            {value}
          </p>
        )}
        {sub && !loading && (
          <p className="mt-0.5 truncate text-xs text-foreground-muted">{sub}</p>
        )}
      </div>
    </Card>
  );
}
