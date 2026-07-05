import {
  keepPreviousData,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';

import {
  createQueryKeys,
  updateInListCache,
  useOptimisticMutation,
  type Paginated,
} from '@/shared/lib/query';
import { conversationApi } from '../api';
import type {
  Conversation,
  ConversationListParams,
  ConversationStatus,
  Message,
  SendMessageDto,
} from './types';

export const conversationKeys = {
  ...createQueryKeys('conversations'),
  /** All message threads (prefix, for invalidation). */
  messagesAll: () => ['conversations', 'messages'] as const,
  /** A single conversation's messages (paginated). */
  messages: (conversationId: string, page: number, pageSize: number) =>
    ['conversations', 'messages', conversationId, { page, pageSize }] as const,
  /** Prefix matching every page of one conversation's thread. */
  messagesFor: (conversationId: string) =>
    ['conversations', 'messages', conversationId] as const,
};

export const MESSAGES_PAGE_SIZE = 30;

export function useConversations(params?: ConversationListParams) {
  return useQuery({
    queryKey: conversationKeys.list(params),
    queryFn: () => conversationApi.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useMessages(
  conversationId: string | undefined,
  page = 1,
  pageSize = MESSAGES_PAGE_SIZE,
) {
  return useQuery({
    queryKey: conversationKeys.messages(conversationId ?? '', page, pageSize),
    queryFn: () =>
      conversationApi.messages({
        conversationId: conversationId as string,
        page,
        pageSize,
      }),
    enabled: Boolean(conversationId),
    placeholderData: keepPreviousData,
  });
}

/**
 * Send an OUTBOUND reply with an optimistic bubble.
 *
 * The temporary message is prepended to the first thread page (page 1 = newest,
 * rendered bottom-up) and the parent conversation's preview/timestamp are
 * patched so the list reorders instantly. Server truth reconciles on settle.
 */
export function useSendMessage(conversationId: string) {
  return useOptimisticMutation<
    Message,
    SendMessageDto,
    { tempId: string }
  >({
    mutationFn: (dto) => conversationApi.send(conversationId, dto),
    keysToCancel: [conversationKeys.messagesFor(conversationId)],
    keysToInvalidate: [
      conversationKeys.messagesFor(conversationId),
      conversationKeys.lists(),
    ],
    optimisticUpdate: (dto, qc) => {
      const tempId = `temp-${Date.now()}`;
      const optimistic: Message = {
        id: tempId,
        conversationId,
        direction: 'OUTBOUND',
        channel: 'WHATSAPP',
        text: dto.text,
        createdAt: new Date().toISOString(),
        senderUserId: null,
      };
      prependMessageToThread(qc, conversationId, optimistic);
      patchConversationPreview(qc, conversationId, dto.text, optimistic.createdAt);
      return { tempId };
    },
  });
}

/** Change a conversation's status (OPEN/PENDING/CLOSED), optimistically. */
export function useUpdateConversationStatus() {
  return useOptimisticMutation<
    Conversation,
    { id: string; status: ConversationStatus }
  >({
    mutationFn: ({ id, status }) =>
      conversationApi.updateStatus(id, { status }),
    keysToCancel: [conversationKeys.lists()],
    keysToInvalidate: [conversationKeys.lists()],
    optimisticUpdate: ({ id, status }, qc) => {
      qc.setQueriesData(
        { queryKey: conversationKeys.lists() },
        updateInListCache<Conversation>(id, { status }),
      );
    },
  });
}

/* ------------------------------------------------------------------ *
 * Realtime cache helpers — used by the chats page socket subscription.
 * ------------------------------------------------------------------ */

/** Prepend a message to page 1 of a thread's cache (newest-first storage). */
function prependMessageToThread(
  qc: QueryClient,
  conversationId: string,
  message: Message,
): void {
  qc.setQueriesData<Paginated<Message>>(
    { queryKey: conversationKeys.messagesFor(conversationId) },
    (old) => {
      if (!old) return old;
      // Only touch the first page so older pages stay intact.
      if (old.meta.page !== 1) return old;
      if (old.items.some((m) => m.id === message.id)) return old;
      return {
        ...old,
        items: [message, ...old.items],
        meta: { ...old.meta, total: old.meta.total + 1 },
      };
    },
  );
}

/** Patch a conversation's preview + timestamp across all cached list pages. */
function patchConversationPreview(
  qc: QueryClient,
  conversationId: string,
  preview: string,
  at: string,
): void {
  qc.setQueriesData<Paginated<Conversation>>(
    { queryKey: conversationKeys.lists() },
    (old) => {
      if (!old) return old;
      return {
        ...old,
        items: old.items.map((c) =>
          c.id === conversationId
            ? { ...c, lastMessagePreview: preview, lastMessageAt: at }
            : c,
        ),
      };
    },
  );
}

/**
 * Apply an inbound/outbound realtime message to the cache. Appends it to the
 * open thread (dedup + drops the matching optimistic temp bubble) and bumps the
 * conversation preview. Increments unread only for INBOUND on non-active chats.
 */
export function applyIncomingMessage(
  qc: QueryClient,
  message: Message,
  activeConversationId?: string,
): void {
  const conversationId = message.conversationId;
  if (!conversationId) return;

  qc.setQueriesData<Paginated<Message>>(
    { queryKey: conversationKeys.messagesFor(conversationId) },
    (old) => {
      if (!old || old.meta.page !== 1) return old;
      if (old.items.some((m) => m.id === message.id)) return old;
      // Replace a matching optimistic OUTBOUND bubble (same text) if present.
      const withoutTemp =
        message.direction === 'OUTBOUND'
          ? old.items.filter(
              (m) => !(m.id.startsWith('temp-') && m.text === message.text),
            )
          : old.items;
      return {
        ...old,
        items: [message, ...withoutTemp],
        meta: { ...old.meta, total: old.meta.total + 1 },
      };
    },
  );

  qc.setQueriesData<Paginated<Conversation>>(
    { queryKey: conversationKeys.lists() },
    (old) => {
      if (!old) return old;
      return {
        ...old,
        items: old.items.map((c) => {
          if (c.id !== conversationId) return c;
          const isActive = conversationId === activeConversationId;
          const bumpUnread =
            message.direction === 'INBOUND' && !isActive;
          return {
            ...c,
            lastMessagePreview: message.text,
            lastMessageAt: message.createdAt,
            unreadCount: bumpUnread ? c.unreadCount + 1 : c.unreadCount,
          };
        }),
      };
    },
  );
}

/** Merge a realtime `conversation:updated` payload into every cached list. */
export function applyConversationUpdate(
  qc: QueryClient,
  conversation: Conversation,
): void {
  let found = false;
  qc.setQueriesData<Paginated<Conversation>>(
    { queryKey: conversationKeys.lists() },
    (old) => {
      if (!old) return old;
      const items = old.items.map((c) => {
        if (c.id === conversation.id) {
          found = true;
          return { ...c, ...conversation };
        }
        return c;
      });
      return { ...old, items };
    },
  );
  // A brand-new conversation not in any cached page: refetch lists so it shows.
  if (!found) {
    void qc.invalidateQueries({ queryKey: conversationKeys.lists() });
  }
}

/** Hook returning the queryClient-bound realtime cache appliers. */
export function useConversationRealtimeCache() {
  const qc = useQueryClient();
  return {
    applyMessage: (message: Message, activeId?: string) =>
      applyIncomingMessage(qc, message, activeId),
    applyConversation: (conversation: Conversation) =>
      applyConversationUpdate(qc, conversation),
  };
}
