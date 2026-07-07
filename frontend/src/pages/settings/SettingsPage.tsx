import { useTranslation } from 'react-i18next';

import { PageHeader } from '@/shared/ui';
import { ROLES } from '@/shared/config';
import { useSessionStore, selectRole } from '@/entities/session';
import { ConnectTelegramCard } from '@/features/link-telegram';

import { SystemSettingsCard } from './ui/SystemSettingsCard';

/**
 * Settings screen — available to any authenticated user. Hosts the
 * "Connect Telegram" card plus (for the FOUNDER only) the flexible
 * "System settings" card; laid out as a single column that reads well on
 * mobile (320-425px) and caps width on large screens.
 */
export function SettingsPage() {
  const { t } = useTranslation();
  const role = useSessionStore(selectRole);
  const isFounder = role === ROLES.FOUNDER;

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('settings.title')}
        description={t('settings.subtitle')}
      />

      <div className="grid max-w-2xl grid-cols-1 gap-5">
        {isFounder && <SystemSettingsCard />}
        <ConnectTelegramCard />
      </div>
    </div>
  );
}
