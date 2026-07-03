import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { AxiosError } from 'axios';
import { Lock, Mail } from 'lucide-react';
import { Button, Input } from '@/shared/ui';
import { extractErrorMessage } from '@/shared/api';
import { useLogin } from '../model/useLogin';

export interface LoginFormProps {
  /** Called after a successful login (e.g. to navigate to the dashboard). */
  onSuccess?: () => void;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const { t } = useTranslation();
  const { mutate, isPending } = useLogin();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const [formError, setFormError] = useState<string | null>(null);

  const validate = (): boolean => {
    const errors: { email?: string; password?: string } = {};
    if (!email.trim()) errors.email = t('auth.requiredEmail');
    if (!password) errors.password = t('auth.requiredPassword');
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    if (!validate()) return;

    mutate(
      { email: email.trim(), password },
      {
        onSuccess: () => onSuccess?.(),
        onError: (error) => {
          if (error instanceof AxiosError && error.response?.status === 401) {
            setFormError(t('auth.invalidCredentials'));
            return;
          }
          setFormError(extractErrorMessage(error) ?? t('auth.genericError'));
        },
      },
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <Input
        type="email"
        name="email"
        autoComplete="email"
        label={t('auth.email')}
        placeholder={t('auth.emailPlaceholder')}
        leftIcon={<Mail className="h-5 w-5" />}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={fieldErrors.email}
        disabled={isPending}
      />

      <Input
        type="password"
        name="password"
        autoComplete="current-password"
        label={t('auth.password')}
        placeholder={t('auth.passwordPlaceholder')}
        leftIcon={<Lock className="h-5 w-5" />}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={fieldErrors.password}
        disabled={isPending}
      />

      {formError && (
        <div
          role="alert"
          className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger"
        >
          {formError}
        </div>
      )}

      <Button type="submit" fullWidth size="lg" loading={isPending}>
        {isPending ? t('auth.submitting') : t('auth.submit')}
      </Button>
    </form>
  );
}
