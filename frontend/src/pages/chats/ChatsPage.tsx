import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MessagesSquare, Wifi, WifiOff } from 'lucide-react';

import { PageHeader } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { useMediaQuery } from '@/shared/lib/hooks';
import { useRealtimeNamespace } from '@/shared/lib/realtime';
import {
  useConversations,
  useConversationRealtimeCache,
  type ChatChannel,
  type Conversation,
  type ConversationListParams,
  type ConversationStatus,
  type Message,
} from '@/entities/conversation';
import { ConversationList } from './ui/ConversationList';
import { MessageThread } from './ui/MessageThread';

const PAGE_SIZE = 20;

/**
 * Omnichannel inbox (SALES_MANAGER + FOUNDER). Left: filterable conversation
 * list; right: the selected thread with a reply box and status switcher.
 * Subscribes to the '/chats' socket namespace and patches the query cache on
 * `message:new` / `conversation:updated` for realtime updates. Responsive: the
 * list and thread sit side-by-side on desktop and swap in place on mobile.
 */
export function ChatsPage() {
  const { t } = useTranslation();
  const isDesktop = useMediaQuery('(min-width: 768px)');

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<ConversationStatus | ''>('');
  const [channelFilter, setChannelFilter] = useState<ChatChannel | ''>('');
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);

  const params = useMemo<ConversationListParams>(
    () => ({
      page,
      pageSize: PAGE_SIZE,
      status: statusFilter || undefined,
      channel: channelFilter || undefined,
    }),
    [page, statusFilter, channelFilter],
  );

  const { data, isLoading, isError } = useConversations(params);
  const conversations = useMemo(() => data?.items ?? [], [data?.items]);
  const pageCount = data?.meta.pageCount ?? 1;

  // Resolve the selected conversation from the freshest cached list so its
  // header (status, preview, unread) reflects realtime updates.
  const selected = useMemo(
    () => conversations.find((c) => c.id === selectedId),
    [conversations, selectedId],
  );

  const { applyMessage, applyConversation } = useConversationRealtimeCache();

  // Keep the active-conversation id in state so realtime handlers can decide
  // whether an inbound message should bump the unread counter.
  const [activeId, setActiveId] = useState<string | undefined>(undefined);
  useEffect(() => setActiveId(selectedId), [selectedId]);

  const handleMessageNew = useCallback(
    (...args: unknown[]) => {
      const message = args[0] as Message | undefined;
      if (message) applyMessage(message, activeId);
    },
    [applyMessage, activeId],
  );

  const handleConversationUpdated = useCallback(
    (...args: unknown[]) => {
      const conversation = args[0] as Conversation | undefined;
      if (conversation) applyConversation(conversation);
    },
    [applyConversation],
  );

  const status = useRealtimeNamespace('/chats', {
    'message:new': handleMessageNew,
    'conversation:updated': handleConversationUpdated,
  });

  const onSelect = (c: Conversation) => setSelectedId(c.id);
  const onBack = () => setSelectedId(undefined);

  const onStatusChange = (value: ConversationStatus | '') => {
    setStatusFilter(value);
    setPage(1);
  };
  const onChannelChange = (value: ChatChannel | '') => {
    setChannelFilter(value);
    setPage(1);
  };

  const list = (
    <ConversationList
      conversations={conversations}
      isLoading={isLoading}
      isError={isError}
      selectedId={selectedId}
      onSelect={onSelect}
      statusFilter={statusFilter}
      channelFilter={channelFilter}
      onStatusChange={onStatusChange}
      onChannelChange={onChannelChange}
      page={page}
      pageCount={pageCount}
      onPageChange={setPage}
      className="h-full"
    />
  );

  const thread = selected ? (
    <MessageThread
      key={selected.id}
      conversation={selected}
      showBack={!isDesktop}
      onBack={onBack}
      className="h-full"
    />
  ) : (
    <EmptyThread />
  );

  return (
    <div className="flex h-[calc(100dvh-8rem)] min-h-[28rem] flex-col">
      <PageHeader
        title={t('pages.chats')}
        description={t('chats.subtitle')}
        actions={<ConnectionPill connected={status === 'connected'} t={t} />}
      />

      <div className="flex min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-surface">
        {isDesktop ? (
          <>
            <div className="flex w-full max-w-xs flex-col border-r border-border lg:max-w-sm">
              {list}
            </div>
            <div className="min-w-0 flex-1">{thread}</div>
          </>
        ) : (
          // Mobile: show the list OR the thread, never both.
          <div className="w-full">{selected ? thread : list}</div>
        )}
      </div>
    </div>
  );
}

/** Placeholder shown in the thread pane when no conversation is selected. */
function EmptyThread() {
  const { t } = useTranslation();
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-muted text-foreground-muted">
        <MessagesSquare className="h-7 w-7" aria-hidden />
      </div>
      <p className="text-sm font-medium text-foreground">
        {t('chats.selectPrompt')}
      </p>
      <p className="max-w-xs text-sm text-foreground-muted">
        {t('chats.selectPromptHint')}
      </p>
    </div>
  );
}

/** Small realtime connection indicator in the page header. */
function ConnectionPill({
  connected,
  t,
}: {
  connected: boolean;
  t: (key: string) => string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
        connected
          ? 'bg-success/15 text-success'
          : 'bg-surface-muted text-foreground-muted',
      )}
      title={connected ? t('chats.realtimeOn') : t('chats.realtimeOff')}
    >
      {connected ? (
        <Wifi className="h-3.5 w-3.5" aria-hidden />
      ) : (
        <WifiOff className="h-3.5 w-3.5" aria-hidden />
      )}
      <span className="hidden sm:inline">
        {connected ? t('chats.realtimeOn') : t('chats.realtimeOff')}
      </span>
    </span>
  );
}
