import { IsEnum } from 'class-validator';
import { ConversationStatus } from '@prisma/client';

/**
 * Body for PATCH /chats/conversations/:id — move the conversation between
 * OPEN / PENDING / CLOSED. Validated against the Prisma enum.
 */
export class UpdateConversationDto {
  @IsEnum(ConversationStatus)
  status!: ConversationStatus;
}
