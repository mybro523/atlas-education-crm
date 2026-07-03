import type { TFunction } from 'i18next';
import { MessageCircle, Instagram } from 'lucide-react';

import { Badge } from '@/shared/ui';
import type {
  ChatChannel,
  ConversationStatus,
} from '@/entities/conversation';

/** Per-channel display metadata (label + brand tint). */
const CHANNEL_META: Record<
  ChatChannel,
  { labelKey: string; className: string }
> = {
  WHATSAPP: {
    labelKey: 'chats.channel.whatsapp',
    className:
      'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
  },
  INSTAGRAM: {
    labelKey: 'chats.channel.instagram',
    className:
      'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/20 dark:text-fuchsia-300',
  },
};

export function ChannelIcon({
  channel,
  className = 'h-3.5 w-3.5',
}: {
  channel: ChatChannel;
  className?: string;
}) {
  return channel === 'INSTAGRAM' ? (
    <Instagram className={className} aria-hidden />
  ) : (
    <MessageCircle className={className} aria-hidden />
  );
}

/** Small pill showing the messaging channel with its icon + brand color. */
export function ChannelBadge({
  channel,
  t,
}: {
  channel: ChatChannel;
  t: TFunction;
}) {
  const meta = CHANNEL_META[channel];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${meta.className}`}
    >
      <ChannelIcon channel={channel} />
      {t(meta.labelKey)}
    </span>
  );
}

const STATUS_META: Record<
  ConversationStatus,
  { variant: 'success' | 'warning' | 'muted'; labelKey: string }
> = {
  OPEN: { variant: 'success', labelKey: 'chats.status.open' },
  PENDING: { variant: 'warning', labelKey: 'chats.status.pending' },
  CLOSED: { variant: 'muted', labelKey: 'chats.status.closed' },
};

/** Dot badge reflecting a conversation's workflow status. */
export function StatusBadge({
  status,
  t,
}: {
  status: ConversationStatus;
  t: TFunction;
}) {
  const meta = STATUS_META[status];
  return (
    <Badge variant={meta.variant} dot>
      {t(meta.labelKey)}
    </Badge>
  );
}
