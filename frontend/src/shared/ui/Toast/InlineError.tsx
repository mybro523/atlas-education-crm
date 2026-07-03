import { AlertCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

export interface InlineErrorProps {
  /** Localized error message. Renders nothing when falsy. */
  message?: ReactNode | null;
  className?: string;
}

/**
 * Inline, section-level error banner. Complements toasts for errors that should
 * stay visible in place (e.g. a failed list load or a form-level error).
 * Returns null when there is no message, so callers can render it directly.
 */
export function InlineError({ message, className }: InlineErrorProps) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger',
        className,
      )}
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span className="min-w-0">{message}</span>
    </div>
  );
}
