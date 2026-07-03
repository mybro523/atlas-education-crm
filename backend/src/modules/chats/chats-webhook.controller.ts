import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { ChatsService } from './chats.service';

/**
 * Public Meta webhook endpoints for the omnichannel inbox.
 *
 * These are @Public (no JWT / no RolesGuard) because Meta calls them
 * server-to-server. They are deliberately kept in a separate controller from
 * the RBAC-guarded ChatsController so the class-level @Roles/@UseGuards there
 * never applies to the webhook (a public route under a guarded controller would
 * otherwise 403).
 *
 * - GET  /chats/webhook  → verification handshake (echo hub.challenge).
 * - POST /chats/webhook  → receive WA/IG events; always answer 200 so Meta does
 *   not retry/back off, even on a malformed body.
 *
 * NOTE: signature verification (X-Hub-Signature-256 with META_APP_SECRET) is a
 * hardening step that requires the raw request body; ingestWebhook itself is
 * defensive and never throws, so a malformed/forged body is a harmless no-op.
 */
@Controller('chats/webhook')
export class ChatsWebhookController {
  constructor(private readonly chatsService: ChatsService) {}

  /**
   * Meta verification: when the query's verify token matches, echo back the
   * challenge (as plain text) so Meta activates the subscription; else 403.
   */
  @Public()
  @Get()
  verify(
    @Query('hub.mode') mode?: string,
    @Query('hub.verify_token') token?: string,
    @Query('hub.challenge') challenge?: string,
  ): string {
    const result = this.chatsService.verifyWebhook(mode, token, challenge);
    if (result === null) {
      throw new ForbiddenException('Webhook verification failed');
    }
    return result;
  }

  /**
   * Receive inbound WhatsApp / Instagram events. Fire-and-forget ingestion;
   * we always return 200 regardless of payload validity.
   */
  @Public()
  @Post()
  @HttpCode(HttpStatus.OK)
  async receive(@Body() payload: unknown): Promise<{ received: true }> {
    await this.chatsService.ingestWebhook(payload);
    return { received: true };
  }
}
