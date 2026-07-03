import { useTranslation } from 'react-i18next';

import { PageHeader } from '@/shared/ui';
import { ConnectTelegramCard } from '@/features/link-telegram';

/**
 * Settings screen — available to any authenticated user. Currently hosts the
 * "Connect Telegram" card; laid out as a single column that reads well on
 * mobile (320-425px) and caps width on large screens.
 */
export function SettingsPage() {
  const { t } = useTranslation();

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('settings.title')}
        description={t('settings.subtitle')}
      />

      <div className="grid max-w-2xl grid-cols-1 gap-5">
        <ConnectTelegramCard />
      </div>
    </div>
  );
}
