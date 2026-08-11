import {
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';
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
 * Inbound POSTs are authenticated by the X-Hub-Signature-256 HMAC (computed by
 * Meta with META_APP_SECRET over the raw body). When META_APP_SECRET is set, a
 * missing/invalid signature is rejected — this stops anyone from injecting
 * forged conversations/messages into the sales inbox. When the secret is not
 * configured (e.g. local dev without Meta), verification is skipped.
 */
@Controller('chats/webhook')
export class ChatsWebhookController {
  constructor(
    private readonly chatsService: ChatsService,
    private readonly config: ConfigService,
  ) {}

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
  async receive(@Req() req: RawBodyRequest<Request>): Promise<{ received: true }> {
    const appSecret = this.config.get<string>('meta.appSecret');
    const raw = req.rawBody;
    if (appSecret) {
      const signature = req.headers['x-hub-signature-256'];
      if (!raw || !this.isValidSignature(raw, signature, appSecret)) {
        throw new ForbiddenException('Invalid webhook signature');
      }
    }
    // rawBody is preserved but Nest still parses JSON into req.body.
    await this.chatsService.ingestWebhook((req as unknown as { body: unknown }).body);
    return { received: true };
  }

  /** Constant-time compare of the sha256=… HMAC header against the raw body. */
  private isValidSignature(
    raw: Buffer,
    header: string | string[] | undefined,
    appSecret: string,
  ): boolean {
    const provided = Array.isArray(header) ? header[0] : header;
    if (!provided || !provided.startsWith('sha256=')) {
      return false;
    }
    const expected = 'sha256=' + createHmac('sha256', appSecret).update(raw).digest('hex');
    const a = Buffer.from(provided);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  }
}
