import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ChatsService } from './chats.service';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { QueryConversationsDto } from './dto/query-conversations.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';

/**
 * Omnichannel inbox REST surface (WhatsApp + Instagram).
 *
 * Roles: SALES_MANAGER works the inbox; FOUNDER views it for oversight.
 * ADMIN explicitly has NO access (spec §3 note, decision #9). RolesGuard is not
 * global, so it is wired here alongside @Roles (see API_CONTRACT §0.1).
 *
 * The public Meta webhooks live in ChatsWebhookController (unauthenticated).
 */
@UseGuards(RolesGuard)
@Roles(Role.SALES_MANAGER, Role.FOUNDER)
@Controller('chats/conversations')
export class ChatsController {
  constructor(private readonly chatsService: ChatsService) {}

  /** GET /chats/conversations — paginated, filter by status/channel. */
  @Get()
  listConversations(@Query() query: QueryConversationsDto) {
    return this.chatsService.listConversations(query);
  }

  /** GET /chats/conversations/:id/messages — paginated message history. */
  @Get(':id/messages')
  getMessages(
    @Param('id') id: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.chatsService.getMessages(id, query);
  }

  /** POST /chats/conversations/:id/messages — send an operator reply. */
  @Post(':id/messages')
  sendReply(
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.chatsService.sendReply(id, dto.text, userId);
  }

  /** PATCH /chats/conversations/:id — change status (OPEN/PENDING/CLOSED). */
  @Patch(':id')
  setStatus(
    @Param('id') id: string,
    @Body() dto: UpdateConversationDto,
  ) {
    return this.chatsService.setStatus(id, dto.status);
  }
}
