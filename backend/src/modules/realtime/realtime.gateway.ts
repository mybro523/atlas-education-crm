import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

/** A write that happened to some entity. Carries NO row data — only enough for
 * clients to invalidate the right cache and refetch through the RBAC-guarded
 * REST API. This is what makes "everything realtime" safe: a student socket
 * learns that `FinanceRecord` changed but still cannot read finance data. */
export interface EntityChangeEvent {
  /** Prisma model name, e.g. 'Student', 'Payment', 'FinanceRecord'. */
  resource: string;
  action: 'created' | 'updated' | 'deleted';
  /** Present for single-record writes; absent for bulk (updateMany/deleteMany). */
  id?: string;
  at: string;
}

export const ENTITY_CHANGED_EVENT = 'entity:changed';

/**
 * App-wide realtime bus. socket.io namespace: '/realtime'.
 *
 * Every mutating Prisma write is broadcast here (via a Prisma middleware, see
 * PrismaService) as a lightweight {@link EntityChangeEvent}. The frontend maps
 * the resource name to TanStack Query keys and invalidates them, so open pages
 * refresh within ~100ms of any change made by anyone.
 *
 * AUTH: any authenticated user (any of the 5 roles) may connect — the events
 * carry no sensitive fields, and the actual data stays behind REST RBAC. An
 * invalid/missing token is dropped immediately.
 */
@WebSocketGateway({
  namespace: '/realtime',
  cors: { origin: true, credentials: true },
})
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(RealtimeGateway.name);

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

      await this.jwt.verifyAsync(token, {
        secret: this.config.get<string>('jwt.accessSecret'),
      });
    } catch {
      this.reject(client, 'invalid token');
    }
  }

  private reject(client: Socket, reason: string): void {
    this.logger.debug(`Realtime socket rejected (${reason}): ${client.id}`);
    client.disconnect(true);
  }

  handleDisconnect(): void {
    /* no per-socket state to clean up */
  }

  /** Broadcast an entity change to every connected client. Never throws. */
  emitEntityChange(
    resource: string,
    action: EntityChangeEvent['action'],
    id?: string,
  ): void {
    const payload: EntityChangeEvent = {
      resource,
      action,
      id,
      at: new Date().toISOString(),
    };
    try {
      if (!this.server) return;
      this.server.emit(ENTITY_CHANGED_EVENT, payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to emit entity change: ${message}`);
    }
  }
}
