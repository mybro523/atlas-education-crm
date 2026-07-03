import { type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../Modal';
import { Button } from '../Button';

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  /** Confirm handler. Keep it sync — the dialog shows `loading` via `confirming`. */
  onConfirm: () => void;
  title: string;
  /** Localized body text or node. */
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** 'danger' (default) for destructive actions, 'primary' otherwise. */
  variant?: 'danger' | 'primary';
  /** Show a spinner + disable buttons while the action runs. */
  confirming?: boolean;
}

/**
 * Confirmation dialog for destructive/important actions. Defaults to a danger
 * treatment with a warning icon. Fully themed + mobile-first.
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  cancelLabel,
  variant = 'danger',
  confirming = false,
}: ConfirmDialogProps) {
  const { t } = useTranslation();

  return (
    <Modal
      open={open}
      onClose={onClose}
      closeLabel={t('common.close')}
      className="max-w-md"
    >
      <div className="flex gap-4">
        {variant === 'danger' && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-danger/10 text-danger">
            <AlertTriangle className="h-5 w-5" aria-hidden />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          {description && (
            <div className="mt-1.5 text-sm text-foreground-muted">
              {description}
            </div>
          )}
        </div>
      </div>

      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="secondary"
          onClick={onClose}
          disabled={confirming}
        >
          {cancelLabel ?? t('common.cancel')}
        </Button>
        <Button
          type="button"
          variant={variant === 'danger' ? 'danger' : 'primary'}
          onClick={onConfirm}
          loading={confirming}
        >
          {confirmLabel ?? t('common.confirm')}
        </Button>
      </div>
    </Modal>
  );
}
