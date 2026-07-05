import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { AxiosError } from 'axios';
import { Lock, Mail, Eye, EyeOff } from 'lucide-react';
import { Button, Input } from '@/shared/ui';
import { extractErrorMessage } from '@/shared/api';
import { useLogin } from '../model/useLogin';

/** Shared demo password for every seeded role account. */
const DEMO_PASSWORD = 'Atlas12345!';
const DEMO_ROLES = [
  { key: 'founder', email: 'founder@atlas.local' },
  { key: 'admin', email: 'admin@atlas.local' },
  { key: 'manager', email: 'manager@atlas.local' },
  { key: 'teacher', email: 'teacher@atlas.local' },
  { key: 'student', email: 'student@atlas.local' },
] as const;

export interface LoginFormProps {
  /** Called after a successful login (e.g. to navigate to the dashboard). */
  onSuccess?: () => void;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const { t } = useTranslation();
  const { mutate, isPending } = useLogin();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const [formError, setFormError] = useState<string | null>(null);

  const submit = (creds: { email: string; password: string }) => {
    setFormError(null);
    mutate(creds, {
      onSuccess: () => onSuccess?.(),
      onError: (error) => {
        if (error instanceof AxiosError && error.response?.status === 401) {
          setFormError(t('auth.invalidCredentials'));
          return;
        }
        setFormError(extractErrorMessage(error) ?? t('auth.genericError'));
      },
    });
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const errors: { email?: string; password?: string } = {};
    if (!email.trim()) errors.email = t('auth.requiredEmail');
    if (!password) errors.password = t('auth.requiredPassword');
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
    submit({ email: email.trim(), password });
  };

  const loginAs = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword(DEMO_PASSWORD);
    setFieldErrors({});
    submit({ email: demoEmail, password: DEMO_PASSWORD });
  };

  return (
    <div className="space-y-5">
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
          type={showPassword ? 'text' : 'password'}
          name="password"
          autoComplete="current-password"
          label={t('auth.password')}
          placeholder={t('auth.passwordPlaceholder')}
          leftIcon={<Lock className="h-5 w-5" />}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fieldErrors.password}
          disabled={isPending}
          rightIcon={
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword((v) => !v)}
              aria-label={
                showPassword ? t('auth.hidePassword') : t('auth.showPassword')
              }
              title={
                showPassword ? t('auth.hidePassword') : t('auth.showPassword')
              }
              className="flex h-8 w-8 items-center justify-center rounded-md text-foreground-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          }
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

      {/* Demo accounts — one click signs in as the chosen role. */}
      <div className="rounded-xl border border-border bg-surface-muted/40 p-3">
        <p className="text-xs font-semibold text-foreground">
          {t('auth.demoTitle')}
        </p>
        <p className="mb-2 mt-0.5 text-xs text-foreground-muted">
          {t('auth.demoHint', { password: DEMO_PASSWORD })}
        </p>
        <div className="grid grid-cols-2 gap-2">
          {DEMO_ROLES.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => loginAs(r.email)}
              disabled={isPending}
              className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-left transition-colors hover:border-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="block text-xs font-medium text-foreground">
                {t(`auth.roles.${r.key}`)}
              </span>
              <span className="block truncate text-[11px] text-foreground-muted">
                {r.email}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
