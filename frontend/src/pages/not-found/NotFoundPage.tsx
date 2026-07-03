import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui';
import { ROUTES } from '@/shared/config';

export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center text-foreground">
      <p className="text-6xl font-bold text-primary">404</p>
      <h1 className="text-xl font-semibold">{t('notFound.title')}</h1>
      <p className="max-w-sm text-sm text-foreground-muted">
        {t('notFound.description')}
      </p>
      <Link to={ROUTES.dashboard}>
        <Button>{t('common.backToDashboard')}</Button>
      </Link>
    </div>
  );
}
