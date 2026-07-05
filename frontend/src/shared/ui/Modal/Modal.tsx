import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { useOnClickOutside } from '@/shared/lib/hooks';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** Accessible close-button label (localized by the caller). */
  closeLabel?: string;
  className?: string;
}

export function Modal({
  open,
  onClose,
  title,
  children,
  closeLabel = 'Close',
  className,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  useOnClickOutside(panelRef, onClose, open);

  // Close on Escape + lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 animate-fade-in sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        ref={panelRef}
        className={cn(
          'flex max-h-[90dvh] w-full max-w-lg flex-col rounded-t-2xl border border-border bg-surface shadow-elevated',
          'sm:max-h-[85vh] sm:rounded-2xl',
          className,
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 px-5 pt-5 pb-3">
          {title && (
            <h2 className="text-base font-semibold text-foreground">{title}</h2>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="ml-auto rounded-lg p-1.5 text-foreground-muted transition-colors hover:bg-surface-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
