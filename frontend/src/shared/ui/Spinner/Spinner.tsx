import { Loader2 } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

export interface SpinnerProps {
  className?: string;
  /** Accessible label; defaults to a generic "loading". */
  label?: string;
}

export function Spinner({ className, label = 'Loading' }: SpinnerProps) {
  return (
    <Loader2
      role="status"
      aria-label={label}
      className={cn('h-5 w-5 animate-spin text-primary', className)}
    />
  );
}

/** Full-viewport centered spinner for route-level suspense/fallbacks. */
export function FullPageSpinner({ label }: { label?: string }) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background">
      <Spinner className="h-8 w-8" label={label} />
    </div>
  );
}
