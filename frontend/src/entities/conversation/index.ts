export { conversationApi } from './api';
export type {
  Conversation,
  ConversationStatus,
  ConversationListParams,
  ChatChannel,
  Message,
  MessageDirection,
  MessageListParams,
  SendMessageDto,
  UpdateConversationDto,
} from './model/types';
export {
  conversationKeys,
  MESSAGES_PAGE_SIZE,
  useConversations,
  useMessages,
  useSendMessage,
  useUpdateConversationStatus,
  useConversationRealtimeCache,
  applyIncomingMessage,
  applyConversationUpdate,
} from './model/queries';
