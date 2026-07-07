import { useTranslation } from 'react-i18next';
import { Check, Copy } from 'lucide-react';
import { Button, Modal, useToast } from '@/shared/ui';
import { useCopyToClipboard } from '@/features/link-telegram';

export interface IssuedCredentials {
  email: string;
  password: string;
}

export interface CredentialsModalProps {
  credentials: IssuedCredentials | null;
  onClose: () => void;
}

/**
 * Small info modal shown right after an account is created or its password is
 * reset: the ONLY moment the plain-text password is visible, so the founder
 * can copy the login + password and hand them to the employee.
 */
export function CredentialsModal({
  credentials,
  onClose,
}: CredentialsModalProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const { copied, copy } = useCopyToClipboard();

  const handleCopy = async () => {
    if (!credentials) return;
    const text = `${t('fields.login')}: ${credentials.email}\n${t('fields.password')}: ${credentials.password}`;
    const ok = await copy(text);
    if (ok) toast.success(t('employees.credsCopied'));
  };

  return (
    <Modal
      open={Boolean(credentials)}
      onClose={onClose}
      title={t('teachers.credentialsTitle')}
      closeLabel={t('common.close')}
      className="max-w-md"
    >
      {credentials && (
        <div className="space-y-4">
          <p className="text-sm text-foreground-muted">
            {t('employees.credentialsIssued', {
              email: credentials.email,
              password: credentials.password,
            })}
          </p>

          <dl className="space-y-2 rounded-lg border border-border bg-surface-muted/50 p-3">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <dt className="text-xs font-medium uppercase tracking-wide text-foreground-muted">
                {t('fields.login')}
              </dt>
              <dd className="break-all font-mono text-sm text-foreground">
                {credentials.email}
              </dd>
            </div>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <dt className="text-xs font-medium uppercase tracking-wide text-foreground-muted">
                {t('fields.password')}
              </dt>
              <dd className="break-all font-mono text-sm text-foreground">
                {credentials.password}
              </dd>
            </div>
          </dl>

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={onClose}>
              {t('common.close')}
            </Button>
            <Button type="button" onClick={handleCopy}>
              {copied ? (
                <Check className="h-4 w-4" aria-hidden />
              ) : (
                <Copy className="h-4 w-4" aria-hidden />
              )}
              {t('employees.copyCreds')}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
