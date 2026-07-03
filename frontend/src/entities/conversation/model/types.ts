import type { PaginationParams } from '@/shared/lib/query';

/** Messaging channel a conversation flows through. */
export type ChatChannel = 'WHATSAPP' | 'INSTAGRAM';

/** Conversation workflow state. */
export type ConversationStatus = 'OPEN' | 'PENDING' | 'CLOSED';

/** Direction of a single message relative to the CRM. */
export type MessageDirection = 'INBOUND' | 'OUTBOUND';

/**
 * A single omnichannel conversation (INTEGRATION API — CHATS).
 * GET /chats/conversations returns these in a paginated envelope.
 */
export interface Conversation {
  id: string;
  channel: ChatChannel;
  contactName: string;
  externalId: string;
  status: ConversationStatus;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  unreadCount: number;
}

/** A single message inside a conversation thread. */
export interface Message {
  id: string;
  direction: MessageDirection;
  channel: ChatChannel;
  text: string;
  createdAt: string;
  senderUserId: string | null;
  /** Owning conversation — present on realtime pushes for cache routing. */
  conversationId?: string;
}

/** GET /chats/conversations query params. */
export interface ConversationListParams extends PaginationParams {
  status?: ConversationStatus;
  channel?: ChatChannel;
}

/** GET /chats/conversations/:id/messages query params. */
export interface MessageListParams extends PaginationParams {
  conversationId: string;
}

/** POST /chats/conversations/:id/messages body. */
export interface SendMessageDto {
  text: string;
}

/** PATCH /chats/conversations/:id body. */
export interface UpdateConversationDto {
  status: ConversationStatus;
}
