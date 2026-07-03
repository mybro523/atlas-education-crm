import { Module } from '@nestjs/common';
import { ChatsService } from './chats.service';
import { ChatsController } from './chats.controller';
import { ChatsWebhookController } from './chats-webhook.controller';
import { ChatsGateway } from './chats.gateway';
import { MetaGraphService } from './meta-graph.service';

/**
 * Omnichannel inbox module (WhatsApp + Instagram via Meta Graph) + realtime.
 *
 * - ChatsController          → RBAC-guarded REST (SALES_MANAGER + FOUNDER).
 * - ChatsWebhookController   → public Meta verify/receive webhooks.
 * - ChatsService            → conversations/messages, send, ingest.
 * - MetaGraphService        → outbound Graph API sends (resilient to empty keys).
 * - ChatsGateway            → socket.io '/chats' realtime emitter.
 *
 * PrismaService and ConfigService are provided globally (PrismaModule /
 * ConfigModule) so they are injectable here without re-importing.
 */
@Module({
  controllers: [ChatsController, ChatsWebhookController],
  providers: [ChatsService, MetaGraphService, ChatsGateway],
  exports: [ChatsService],
})
export class ChatsModule {}
