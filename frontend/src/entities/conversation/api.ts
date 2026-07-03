import { axiosClient } from '@/shared/api';
import type { Paginated } from '@/shared/lib/query';
import type {
  Conversation,
  ConversationListParams,
  Message,
  MessageListParams,
  SendMessageDto,
  UpdateConversationDto,
} from './model/types';

/**
 * Chats / omnichannel inbox API (INTEGRATION API — CHATS).
 * Roles: SALES_MANAGER + FOUNDER. All paths under /api.
 */
export const conversationApi = {
  /** GET /chats/conversations — paginated conversation list. */
  async list(
    params?: ConversationListParams,
  ): Promise<Paginated<Conversation>> {
    const { data } = await axiosClient.get<Paginated<Conversation>>(
      '/chats/conversations',
      { params },
    );
    return data;
  },

  /** GET /chats/conversations/:id/messages — paginated thread. */
  async messages({
    conversationId,
    page,
    pageSize,
  }: MessageListParams): Promise<Paginated<Message>> {
    const { data } = await axiosClient.get<Paginated<Message>>(
      `/chats/conversations/${conversationId}/messages`,
      { params: { page, pageSize } },
    );
    return data;
  },

  /** POST /chats/conversations/:id/messages — send an OUTBOUND reply. */
  async send(conversationId: string, dto: SendMessageDto): Promise<Message> {
    const { data } = await axiosClient.post<Message>(
      `/chats/conversations/${conversationId}/messages`,
      dto,
    );
    return data;
  },

  /** PATCH /chats/conversations/:id — change conversation status. */
  async updateStatus(
    conversationId: string,
    dto: UpdateConversationDto,
  ): Promise<Conversation> {
    const { data } = await axiosClient.patch<Conversation>(
      `/chats/conversations/${conversationId}`,
      dto,
    );
    return data;
  },
};
