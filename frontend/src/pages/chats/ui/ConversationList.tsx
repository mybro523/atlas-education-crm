import { useTranslation } from 'react-i18next';
import { MessagesSquare } from 'lucide-react';

import {
  Select,
  Skeleton,
  EmptyState,
  Pagination,
  InlineError,
} from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import type {
  ChatChannel,
  Conversation,
  ConversationStatus,
} from '@/entities/conversation';
import { ChannelBadge } from './channel';
import { formatChatTime } from './chatFormat';

export interface ConversationListProps {
  conversations: Conversation[];
  isLoading: boolean;
  isError: boolean;
  selectedId?: string;
  onSelect: (conversation: Conversation) => void;
  statusFilter: ConversationStatus | '';
  channelFilter: ChatChannel | '';
  onStatusChange: (value: ConversationStatus | '') => void;
  onChannelChange: (value: ChatChannel | '') => void;
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  className?: string;
}

/**
 * Left rail of the inbox: filter controls + the scrollable conversation list.
 * Each row shows channel badge, contact, last-message preview, time, and an
 * unread pill. Selecting a row highlights it and opens its thread.
 */
export function ConversationList({
  conversations,
  isLoading,
  isError,
  selectedId,
  onSelect,
  statusFilter,
  channelFilter,
  onStatusChange,
  onChannelChange,
  page,
  pageCount,
  onPageChange,
  className,
}: ConversationListProps) {
  const { t } = useTranslation();

  return (
    <div className={cn('flex h-full flex-col', className)}>
      {/* Filters */}
      <div className="grid grid-cols-2 gap-2 border-b border-border p-3">
        <Select
          aria-label={t('chats.filter.status')}
          value={statusFilter}
          onChange={(e) =>
            onStatusChange(e.target.value as ConversationStatus | '')
          }
        >
          <option value="">{t('chats.filter.allStatuses')}</option>
          <option value="OPEN">{t('chats.status.open')}</option>
          <option value="PENDING">{t('chats.status.pending')}</option>
          <option value="CLOSED">{t('chats.status.closed')}</option>
        </Select>
        <Select
          aria-label={t('chats.filter.channel')}
          value={channelFilter}
          onChange={(e) =>
            onChannelChange(e.target.value as ChatChannel | '')
          }
        >
          <option value="">{t('chats.filter.allChannels')}</option>
          <option value="WHATSAPP">{t('chats.channel.whatsapp')}</option>
          <option value="INSTAGRAM">{t('chats.channel.instagram')}</option>
        </Select>
      </div>

      {/* List */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {isError ? (
          <div className="p-4">
            <InlineError message={t('crud.loadError')} />
          </div>
        ) : isLoading ? (
          <ul className="divide-y divide-border">
            {Array.from({ length: 6 }).map((_, i) => (
              <li key={i} className="flex items-center gap-3 p-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-1/2" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </li>
            ))}
          </ul>
        ) : conversations.length === 0 ? (
          <EmptyState
            icon={<MessagesSquare className="h-6 w-6" aria-hidden />}
            title={t('chats.empty.title')}
            description={t('chats.empty.description')}
          />
        ) : (
          <ul className="divide-y divide-border">
            {conversations.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => onSelect(c)}
                  aria-current={c.id === selectedId || undefined}
                  className={cn(
                    'flex w-full items-start gap-3 px-3 py-3 text-left transition-colors',
                    'hover:bg-surface-muted focus-visible:bg-surface-muted focus-visible:outline-none',
                    c.id === selectedId && 'bg-brand-50 dark:bg-brand-600/10',
                  )}
                >
                  <ContactAvatar name={c.contactName} channel={c.channel} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-medium text-foreground">
                        {c.contactName || t('chats.unknownContact')}
                      </span>
                      <span className="shrink-0 text-[11px] text-foreground-muted">
                        {formatChatTime(c.lastMessageAt)}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center justify-between gap-2">
                      <p className="truncate text-sm text-foreground-muted">
                        {c.lastMessagePreview || t('chats.noMessages')}
                      </p>
                      {c.unreadCount > 0 && (
                        <span className="ml-auto inline-flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">
                          {c.unreadCount > 99 ? '99+' : c.unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5">
                      <ChannelBadge channel={c.channel} t={t} />
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Pagination */}
      {!isLoading && !isError && pageCount > 1 && (
        <div className="border-t border-border p-2">
          <Pagination
            page={page}
            pageCount={pageCount}
            onPageChange={onPageChange}
          />
        </div>
      )}
    </div>
  );
}

/** Circular initial-based avatar tinted by channel; no external images. */
function ContactAvatar({
  name,
  channel,
}: {
  name: string;
  channel: ChatChannel;
}) {
  const initial = (name || '?').trim().charAt(0).toUpperCase();
  return (
    <span
      className={cn(
        'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
        channel === 'INSTAGRAM'
          ? 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/20 dark:text-fuchsia-300'
          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
      )}
      aria-hidden
    >
      {initial}
    </span>
  );
}
