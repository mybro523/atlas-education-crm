import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Conversation, Message } from '@prisma/client';
import { Server, Socket } from 'socket.io';

/**
 * Realtime gateway for the omnichannel inbox.
 *
 * socket.io namespace: '/chats'. Emits:
 *  - 'message:new'          → a Message (inbound from webhook or outbound reply)
 *  - 'conversation:updated' → a Conversation (new/updated preview, status, etc.)
 *
 * ChatsService calls `emitMessageNew` / `emitConversationUpdated` after every
 * ingest / send / status change so open inboxes update live.
 *
 * NOTE: authentication on the socket is intentionally left open for now (the
 * REST endpoints are RBAC-guarded). To lock it down later, add a
 * `handleConnection` JWT check (verify a token from `client.handshake.auth`)
 * and disconnect unauthorized clients — the emit API below stays the same.
 *
 * RESILIENCE: emits are guarded — if the server isn't ready yet (e.g. during
 * boot) or the socket.io platform failed to attach, we log and no-op instead
 * of throwing into the caller's DB transaction.
 */
@WebSocketGateway({
  namespace: '/chats',
  cors: { origin: true, credentials: true },
})
export class ChatsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(ChatsGateway.name);

  @WebSocketServer()
  private readonly server?: Server;

  handleConnection(client: Socket): void {
    this.logger.debug(`Chats socket connected: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.debug(`Chats socket disconnected: ${client.id}`);
  }

  /** Broadcast a newly created (inbound or outbound) message to all clients. */
  emitMessageNew(message: Message): void {
    this.safeEmit('message:new', message);
  }

  /** Broadcast a created/updated conversation (preview, status, unread…). */
  emitConversationUpdated(conversation: Conversation): void {
    this.safeEmit('conversation:updated', conversation);
  }

  private safeEmit(event: string, payload: unknown): void {
    try {
      if (!this.server) {
        this.logger.warn(
          `Chats gateway not ready — dropping '${event}' emit.`,
        );
        return;
      }
      this.server.emit(event, payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to emit '${event}': ${message}`);
    }
  }
}
