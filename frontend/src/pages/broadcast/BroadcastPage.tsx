import { useTranslation } from 'react-i18next';

import { PageHeader } from '@/shared/ui';
import { BroadcastComposer } from '@/features/send-broadcast';
import { BroadcastHistory } from './ui/BroadcastHistory';

/**
 * SMS Broadcasts (INTEGRATION API, roles ADMIN + FOUNDER). Compose + send an SMS
 * to all students / all teachers / both, and review the delivery history with
 * status badges. Sending is optimistic, so a new entry appears instantly.
 *
 * Layout: single column on mobile (composer first, then history); two columns
 * from lg+ with the composer sticky beside a scrollable history.
 */
export function BroadcastPage() {
  const { t } = useTranslation();

  return (
    <div>
      <PageHeader
        title={t('broadcast.title')}
        description={t('broadcast.subtitle')}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:items-start">
        <div className="lg:sticky lg:top-4">
          <BroadcastComposer />
        </div>
        <BroadcastHistory />
      </div>
    </div>
  );
}
