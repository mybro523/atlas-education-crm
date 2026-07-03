import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { APP_NAME, ROUTES } from '@/shared/config';
import { LanguageSwitcher, ThemeToggle } from '@/shared/ui';
import { LoginForm } from '@/features/auth-login';

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground">
      {/* Top controls */}
      <div className="flex items-center justify-end gap-1 p-4 sm:p-5">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>

      {/* Decorative brand gradient panel on large screens */}
      <div className="flex flex-1 items-center justify-center px-4 pb-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex flex-col items-center text-center">
            <img
              src="/logo.svg"
              alt={APP_NAME}
              className="mb-4 h-16 w-16 rounded-2xl shadow-elevated"
            />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {APP_NAME}
            </h1>
            <p className="mt-1 text-sm text-foreground-muted">
              {t('app.tagline')}
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-6 shadow-card sm:p-8">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-foreground">
                {t('auth.loginTitle')}
              </h2>
              <p className="mt-1 text-sm text-foreground-muted">
                {t('auth.loginSubtitle')}
              </p>
            </div>

            <LoginForm
              onSuccess={() => navigate(ROUTES.dashboard, { replace: true })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
