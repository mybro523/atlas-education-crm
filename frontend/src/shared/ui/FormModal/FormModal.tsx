import { type FormEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../Modal';
import { Button } from '../Button';
import { cn } from '@/shared/lib/cn';

export interface FormModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Form body (inputs). Rendered inside a <form>. */
  children: ReactNode;
  /** Called on form submit. Wire your handleSubmit(...) here. */
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  /** Submit button label. Defaults to the localized "Save". */
  submitLabel?: string;
  /** Cancel button label. Defaults to the localized "Cancel". */
  cancelLabel?: string;
  /** Disables submit + shows spinner (e.g. while a mutation is pending). */
  submitting?: boolean;
  /** Disable the submit button (e.g. invalid form). */
  submitDisabled?: boolean;
  /** Variant for the submit button (e.g. 'danger' for destructive forms). */
  submitVariant?: 'primary' | 'danger';
  /** Top-level form error message (localized by caller). */
  error?: string;
  /** Replace the default footer entirely. */
  footer?: ReactNode;
  className?: string;
}

/**
 * Modal preconfigured as a form: wraps children in a <form>, wires submit, and
 * renders a standard Cancel/Save footer. Pairs with react-hook-form:
 *
 *   <FormModal onSubmit={handleSubmit(onValid)} submitting={mutation.isPending}>
 *     <Input {...register('name')} error={errors.name?.message} />
 *   </FormModal>
 */
export function FormModal({
  open,
  onClose,
  title,
  children,
  onSubmit,
  submitLabel,
  cancelLabel,
  submitting = false,
  submitDisabled = false,
  submitVariant = 'primary',
  error,
  footer,
  className,
}: FormModalProps) {
  const { t } = useTranslation();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      closeLabel={t('common.close')}
      className={className}
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="space-y-4">{children}</div>

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger"
          >
            {error}
          </div>
        )}

        {footer ?? (
          <div
            className={cn(
              'flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end',
            )}
          >
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={submitting}
            >
              {cancelLabel ?? t('common.cancel')}
            </Button>
            <Button
              type="submit"
              variant={submitVariant}
              loading={submitting}
              disabled={submitDisabled}
            >
              {submitLabel ?? t('common.save')}
            </Button>
          </div>
        )}
      </form>
    </Modal>
  );
}
