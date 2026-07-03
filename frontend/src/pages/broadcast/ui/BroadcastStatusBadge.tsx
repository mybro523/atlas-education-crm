import { useTranslation } from 'react-i18next';
import { Badge } from '@/shared/ui';
import type { BroadcastStatus } from '@/entities/broadcast';

const variantByStatus: Record<
  BroadcastStatus,
  'primary' | 'success' | 'warning' | 'danger' | 'muted'
> = {
  QUEUED: 'muted',
  SENDING: 'primary',
  SENT: 'success',
  PARTIAL: 'warning',
  FAILED: 'danger',
};

/** Localized, color-coded status pill for a broadcast delivery state. */
export function BroadcastStatusBadge({ status }: { status: BroadcastStatus }) {
  const { t } = useTranslation();
  const variant = variantByStatus[status] ?? 'muted';
  const animate = status === 'QUEUED' || status === 'SENDING';

  return (
    <Badge variant={variant} dot className={animate ? 'animate-pulse' : undefined}>
      {t(`broadcast.status.${status}`)}
    </Badge>
  );
}
