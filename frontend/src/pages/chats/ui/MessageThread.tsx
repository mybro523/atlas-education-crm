import { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, MessageSquareText } from 'lucide-react';

import {
  Select,
  Spinner,
  EmptyState,
  InlineError,
} from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { ReplyBox } from '@/features/send-message';
import {
  useMessages,
  useUpdateConversationStatus,
  type Conversation,
  type ConversationStatus,
  type Message,
} from '@/entities/conversation';
import { ChannelBadge, StatusBadge } from './channel';
import { formatChatTime } from './chatFormat';

export interface MessageThreadProps {
  conversation: Conversation;
  /** Back button (mobile: return to the list). */
  onBack?: () => void;
  showBack?: boolean;
  className?: string;
}

/**
 * Right pane: the selected conversation's message thread with inbound/outbound
 * bubbles, a header (contact + channel + status switcher) and the reply box.
 * Auto-scrolls to the newest message on load and on realtime/optimistic append.
 */
export function MessageThread({
  conversation,
  onBack,
  showBack = false,
  className,
}: MessageThreadProps) {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useMessages(conversation.id);
  const updateStatus = useUpdateConversationStatus();
  const bottomRef = useRef<HTMLDivElement>(null);

  // API returns newest-first; render oldest -> newest (bottom = latest).
  const messages = useMemo<Message[]>(
    () => (data?.items ? [...data.items].reverse() : []),
    [data?.items],
  );

  const latestId = messages[messages.length - 1]?.id;
  // Scroll to the bottom whenever the thread or its newest message changes.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [conversation.id, latestId]);

  const onStatusChange = (status: ConversationStatus) => {
    if (status === conversation.status) return;
    updateStatus.mutate({ id: conversation.id, status });
  };

  return (
    <div className={cn('flex h-full flex-col', className)}>
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border bg-surface px-3 py-2.5">
        {showBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label={t('common.back')}
            className="-ml-1 rounded-lg p-1.5 text-foreground-muted transition-colors hover:bg-surface-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-semibold text-foreground">
              {conversation.contactName || t('chats.unknownContact')}
            </span>
            <ChannelBadge channel={conversation.channel} t={t} />
          </div>
          <div className="mt-0.5">
            <StatusBadge status={conversation.status} t={t} />
          </div>
        </div>
        <div className="w-32 shrink-0 sm:w-36">
          <Select
            aria-label={t('chats.changeStatus')}
            value={conversation.status}
            disabled={updateStatus.isPending}
            onChange={(e) =>
              onStatusChange(e.target.value as ConversationStatus)
            }
          >
            <option value="OPEN">{t('chats.status.open')}</option>
            <option value="PENDING">{t('chats.status.pending')}</option>
            <option value="CLOSED">{t('chats.status.closed')}</option>
          </Select>
        </div>
      </div>

      {/* Messages */}
      <div className="min-h-0 flex-1 overflow-y-auto bg-background px-3 py-4">
        {isError ? (
          <InlineError message={t('crud.loadError')} />
        ) : isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Spinner className="h-6 w-6" label={t('common.loading')} />
          </div>
        ) : messages.length === 0 ? (
          <EmptyState
            icon={<MessageSquareText className="h-6 w-6" aria-hidden />}
            title={t('chats.noMessages')}
            description={t('chats.startConversation')}
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} />
            ))}
          </ul>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Reply box */}
      <ReplyBox
        conversationId={conversation.id}
        disabled={conversation.status === 'CLOSED'}
        disabledHint={t('chats.closedHint')}
      />
    </div>
  );
}

/** A single chat bubble; outbound aligns right (brand), inbound left (surface). */
function MessageBubble({ message }: { message: Message }) {
  const isOutbound = message.direction === 'OUTBOUND';
  const isPending = message.id.startsWith('temp-');
  return (
    <li
      className={cn(
        'flex w-full',
        isOutbound ? 'justify-end' : 'justify-start',
      )}
    >
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-3.5 py-2 text-sm shadow-sm sm:max-w-[70%]',
          isOutbound
            ? 'rounded-br-sm bg-primary text-primary-foreground'
            : 'rounded-bl-sm bg-surface text-foreground border border-border',
          isPending && 'opacity-70',
        )}
      >
        <p className="whitespace-pre-wrap break-words">{message.text}</p>
        <span
          className={cn(
            'mt-1 block text-right text-[10px]',
            isOutbound ? 'text-primary-foreground/70' : 'text-foreground-muted',
          )}
        >
          {formatChatTime(message.createdAt)}
        </span>
      </div>
    </li>
  );
}
