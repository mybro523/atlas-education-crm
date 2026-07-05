import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

export interface EmptyStateProps {
  /** Localized title (caller passes a translated string). */
  title: string;
  /** Optional localized description under the title. */
  description?: string;
  /** Icon shown above the title. Defaults to an inbox glyph. */
  icon?: ReactNode;
  /** Optional call-to-action (e.g. a "Create" Button). */
  action?: ReactNode;
  className?: string;
}

/** Friendly empty-collection placeholder. Themed + centered. */
export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 px-6 py-12 text-center',
        className,
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-muted text-foreground-muted">
        {icon ?? <Inbox className="h-6 w-6" aria-hidden />}
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description && (
          <p className="mx-auto max-w-xs text-sm text-foreground-muted">
            {description}
          </p>
        )}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
