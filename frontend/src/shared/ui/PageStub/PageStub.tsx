import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Construction } from 'lucide-react';
import { Card } from '@/shared/ui/Card';

export interface PageStubProps {
  /** Page title (already-resolved string). */
  title: string;
  icon?: ReactNode;
}

/** Titled placeholder used by not-yet-implemented sections. */
export function PageStub({ title, icon }: PageStubProps) {
  const { t } = useTranslation();
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        {icon}
        <h1 className="text-xl font-semibold text-foreground sm:text-2xl">
          {title}
        </h1>
      </div>

      <Card className="flex flex-col items-center justify-center gap-3 py-14 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-primary dark:bg-brand-950">
          <Construction className="h-6 w-6" />
        </span>
        <p className="text-base font-medium text-foreground">
          {t('common.comingSoon')}
        </p>
        <p className="max-w-sm text-sm text-foreground-muted">
          {t('common.comingSoonHint')}
        </p>
      </Card>
    </div>
  );
}
