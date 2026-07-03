import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Info, XCircle, AlertTriangle, X } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

export interface ToastOptions {
  /** Localized message (caller passes a translated string). */
  message: string;
  variant?: ToastVariant;
  /** Auto-dismiss after N ms. 0 disables auto-dismiss. Default 4000. */
  duration?: number;
}

interface ToastItem extends Required<Omit<ToastOptions, 'duration'>> {
  id: number;
  duration: number;
}

interface ToastContextValue {
  toast: (options: ToastOptions) => number;
  success: (message: string, duration?: number) => number;
  error: (message: string, duration?: number) => number;
  info: (message: string, duration?: number) => number;
  warning: (message: string, duration?: number) => number;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const variantStyles: Record<ToastVariant, string> = {
  success: 'border-success/30 bg-surface text-foreground',
  error: 'border-danger/30 bg-surface text-foreground',
  info: 'border-border bg-surface text-foreground',
  warning: 'border-amber-500/30 bg-surface text-foreground',
};

const variantIcon: Record<ToastVariant, ReactNode> = {
  success: <CheckCircle2 className="h-5 w-5 text-success" aria-hidden />,
  error: <XCircle className="h-5 w-5 text-danger" aria-hidden />,
  info: <Info className="h-5 w-5 text-primary" aria-hidden />,
  warning: <AlertTriangle className="h-5 w-5 text-amber-500" aria-hidden />,
};

/**
 * Toast provider. Mount once near the app root (inside providers). Exposes
 * `useToast()` for imperative notifications from anywhere in the tree.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((tItem) => tItem.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const toast = useCallback(
    ({ message, variant = 'info', duration = 4000 }: ToastOptions) => {
      const id = ++idRef.current;
      setToasts((prev) => [...prev, { id, message, variant, duration }]);
      if (duration > 0) {
        const timer = setTimeout(() => dismiss(id), duration);
        timers.current.set(id, timer);
      }
      return id;
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      toast,
      dismiss,
      success: (message, duration) =>
        toast({ message, variant: 'success', duration }),
      error: (message, duration) =>
        toast({ message, variant: 'error', duration }),
      info: (message, duration) =>
        toast({ message, variant: 'info', duration }),
      warning: (message, duration) =>
        toast({ message, variant: 'warning', duration }),
    }),
    [toast, dismiss],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div
          className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-0 sm:items-end"
          role="region"
          aria-live="polite"
          aria-label={t('common.notifications')}
        >
          {toasts.map((tItem) => (
            <div
              key={tItem.id}
              role="status"
              className={cn(
                'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border px-4 py-3 shadow-elevated animate-fade-in',
                variantStyles[tItem.variant],
              )}
            >
              <span className="mt-0.5 shrink-0">{variantIcon[tItem.variant]}</span>
              <p className="min-w-0 flex-1 text-sm">{tItem.message}</p>
              <button
                type="button"
                onClick={() => dismiss(tItem.id)}
                className="shrink-0 rounded-md p-0.5 text-foreground-muted transition-colors hover:bg-surface-muted hover:text-foreground"
                aria-label={t('actions.dismiss')}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}

/** Access the toast API. Must be used within <ToastProvider>. */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within <ToastProvider>');
  }
  return ctx;
}
