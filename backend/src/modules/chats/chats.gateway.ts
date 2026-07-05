import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Conversation, Message } from '@prisma/client';
import { Server, Socket } from 'socket.io';
import { Role } from '../../common/enums/role.enum';

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
 * AUTH: every connection is authenticated — the client must present a valid
 * access token in `handshake.auth.token` (or an `Authorization: Bearer` header),
 * and its role must be SALES_MANAGER or FOUNDER (the same boundary as the REST
 * inbox). Unauthorized sockets are disconnected immediately, so broadcasting to
 * all remaining connected sockets never leaks conversation data past that gate.
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

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const auth = client.handshake.auth as { token?: string } | undefined;
      const header = client.handshake.headers?.authorization;
      const token =
        auth?.token ??
        (header?.startsWith('Bearer ') ? header.slice(7) : undefined);
      if (!token) return this.reject(client, 'missing token');

      const payload = await this.jwt.verifyAsync<{ role?: string }>(token, {
        secret: this.config.get<string>('jwt.accessSecret'),
      });
      if (
        payload.role !== Role.SALES_MANAGER &&
        payload.role !== Role.FOUNDER
      ) {
        return this.reject(client, `role ${payload.role ?? '?'} not allowed`);
      }
      this.logger.debug(
        `Chats socket connected: ${client.id} (${payload.role})`,
      );
    } catch {
      this.reject(client, 'invalid token');
    }
  }

  /** Refuse and drop an unauthorized socket. */
  private reject(client: Socket, reason: string): void {
    this.logger.debug(`Chats socket rejected (${reason}): ${client.id}`);
    client.disconnect(true);
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
