import { IsEnum, IsOptional } from 'class-validator';
import { ConversationStatus, MessageChannel } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

/**
 * Query for GET /chats/conversations — optional `status` / `channel` filters
 * on top of the shared pagination (page / pageSize). Enum values are validated
 * against the Prisma enums so a bad value returns 400 instead of silently
 * matching nothing.
 */
export class QueryConversationsDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(ConversationStatus)
  status?: ConversationStatus;

  @IsOptional()
  @IsEnum(MessageChannel)
  channel?: MessageChannel;
}
