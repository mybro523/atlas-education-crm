import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';

import { useSessionStore, selectUser } from '@/entities/session';

const WARN_DAYS = 7;

/**
 * SaaS subscription banner shown to every academy user when the paid period
 * is about to end (≤7 days). Expired/blocked academies can't log in at all,
 * so this is the "renew soon" heads-up, not the hard gate.
 */
export function SubscriptionBanner() {
  const { t } = useTranslation();
  const user = useSessionStore(selectUser);
  const academy = user?.academy;
  if (!academy) return null;

  const msLeft = new Date(academy.subscriptionEnd).getTime() - Date.now();
  const days = Math.floor(msLeft / 86_400_000);
  if (days > WARN_DAYS || days < 0) return null;

  return (
    <div
      className="flex items-center gap-2 border-b border-amber-300/60 bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200"
      role="status"
    >
      <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
      <span>{t('subscription.expiresSoon', { count: days })}</span>
    </div>
  );
}
