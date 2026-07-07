import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { FormModal, useToast } from '@/shared/ui';
import { extractErrorMessage } from '@/shared/api';
import { useResetStaffPassword, type StaffUser } from '@/entities/staff';
import { PasswordField } from './PasswordField';
import type { IssuedCredentials } from './CredentialsModal';

export interface ResetPasswordModalProps {
  /** The staff member whose password is being reset; null keeps it closed. */
  user: StaffUser | null;
  onClose: () => void;
  /** Called after the server confirms — opens the credentials modal. */
  onReset: (credentials: IssuedCredentials) => void;
}

/**
 * Set a new password for a staff account. The founder either types one or
 * rolls a random 8-char password; after the server confirms, the page shows
 * the login + new password for copying (passwords are never readable later).
 */
export function ResetPasswordModal({
  user,
  onClose,
  onReset,
}: ResetPasswordModalProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const resetPassword = useResetStaffPassword();

  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | undefined>(undefined);

  const open = Boolean(user);

  // Fresh field every time the modal opens for a user.
  useEffect(() => {
    if (!open) return;
    setPassword('');
    setError(undefined);
  }, [open, user?.id]);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    if (password.length < 4) {
      setError(t('form.passwordMin'));
      return;
    }

    const target = user;
    const newPassword = password;
    resetPassword.mutate(
      { id: target.id, password: newPassword },
      {
        onSuccess: () => {
          toast.success(t('employees.passwordReset'));
          onReset({ email: target.email ?? '—', password: newPassword });
        },
        onError: (err) =>
          toast.error(extractErrorMessage(err) ?? t('form.saveError')),
      },
    );
    // Optimistic pattern: close immediately; a toast reports the outcome.
    onClose();
  };

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={t('employees.resetTitle')}
      onSubmit={handleSubmit}
      submitting={resetPassword.isPending}
      submitLabel={t('employees.resetPassword')}
      className="max-w-md"
    >
      <p className="text-sm text-foreground-muted">
        {t('employees.newPasswordFor', { name: user?.fullName ?? '' })}
      </p>
      <PasswordField
        value={password}
        onChange={(v) => {
          setPassword(v);
          if (error) setError(undefined);
        }}
        error={error}
        autoFocus
      />
    </FormModal>
  );
}
