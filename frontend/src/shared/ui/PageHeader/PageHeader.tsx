import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

export interface PageHeaderProps {
  /** Localized page title. */
  title: string;
  /** Optional localized subtitle/description under the title. */
  description?: string;
  /** Right-aligned actions (buttons, filters). Wrap on mobile. */
  actions?: ReactNode;
  className?: string;
}

/**
 * Standard page header: title + optional description on the left, actions on
 * the right. Stacks vertically on mobile (flawless 320-425px), row from sm+.
 */
export function PageHeader({
  title,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        'mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <div className="min-w-0 space-y-1">
        <h1 className="truncate text-lg font-semibold tracking-tight text-foreground sm:text-xl">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-foreground-muted">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}
