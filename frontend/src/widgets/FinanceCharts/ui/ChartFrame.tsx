import type { ReactNode } from 'react';

import { Card, CardTitle, Skeleton, EmptyState } from '@/shared/ui';
import { BarChart3 } from 'lucide-react';

export interface ChartFrameProps {
  title: string;
  children: ReactNode;
  loading?: boolean;
  empty?: boolean;
  emptyLabel?: string;
  /**
   * Minimum pixel width of the plotting area. When wider than the viewport the
   * frame becomes horizontally scrollable so charts stay legible at 320px.
   */
  minWidth?: number;
}

/**
 * Card wrapper for a chart: title, loading skeleton, empty state, and a
 * horizontally-scrollable inner area (mobile-first — charts never squash below
 * `minWidth`).
 */
export function ChartFrame({
  title,
  children,
  loading = false,
  empty = false,
  emptyLabel,
  minWidth = 360,
}: ChartFrameProps) {
  return (
    <Card>
      <div className="mb-2">
        <CardTitle>{title}</CardTitle>
      </div>

      {loading ? (
        <Skeleton className="h-[300px] w-full rounded-xl" />
      ) : empty ? (
        <EmptyState
          title={emptyLabel ?? title}
          icon={<BarChart3 className="h-6 w-6" aria-hidden />}
        />
      ) : (
        <div className="-mx-1 overflow-x-auto pb-1">
          <div style={{ minWidth }}>{children}</div>
        </div>
      )}
    </Card>
  );
}
