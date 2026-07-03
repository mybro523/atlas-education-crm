import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ConversationStatus,
  MessageChannel,
  MessageDirection,
  Prisma,
  type Conversation,
  type Message,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  buildPaginatedResult,
  PaginatedResult,
  PaginationQueryDto,
  toSkipTake,
} from '../../common/dto/pagination.dto';
import { QueryConversationsDto } from './dto/query-conversations.dto';
import { MetaGraphService } from './meta-graph.service';
import { ChatsGateway } from './chats.gateway';

/** Conversation row enriched with the derived list fields the inbox needs. */
export interface ConversationListItem {
  id: string;
  channel: MessageChannel;
  contactName: string | null;
  externalId: string;
  status: ConversationStatus;
  lastMessageAt: Date | null;
  lastMessagePreview: string | null;
  unreadCount: number;
}

/**
 * Omnichannel inbox service (WhatsApp + Instagram via Meta Graph).
 *
 * Responsibilities:
 *  - list/read conversations & messages (paginated, filterable),
 *  - send an operator reply (persist OUTBOUND + push to Meta + emit realtime),
 *  - move a conversation through OPEN/PENDING/CLOSED,
 *  - ingest inbound WhatsApp/Instagram webhooks (upsert conversation + append
 *    INBOUND message + emit realtime).
 *
 * RESILIENCE: the outbound Meta call and every realtime emit are guarded — a
 * missing Meta token or a not-yet-ready socket server never throws into the
 * caller, so the operator's reply is always persisted and the app always boots.
 */
@Injectable()
export class ChatsService {
  private readonly logger = new Logger(ChatsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly metaGraph: MetaGraphService,
    private readonly gateway: ChatsGateway,
    private readonly config: ConfigService,
  ) {}

  // -------------------------------------------------------------------------
  // Reads
  // -------------------------------------------------------------------------

  /**
   * GET /chats/conversations — paginated, optionally filtered by status/channel.
   * Ordered by most-recent activity. Each item carries a derived
   * `lastMessagePreview` (latest message text) and `unreadCount` (inbound
   * messages awaiting a reply — proxied from message direction as the schema
   * has no per-message read flag).
   */
  async listConversations(
    query: QueryConversationsDto,
  ): Promise<PaginatedResult<ConversationListItem>> {
    const { skip, take, page, pageSize } = toSkipTake(query);

    const where: Prisma.ConversationWhereInput = {};
    if (query.status) {
      where.status = query.status;
    }
    if (query.channel) {
      where.channel = query.channel;
    }

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.conversation.findMany({
        where,
        orderBy: [{ lastMessageAt: 'desc' }, { createdAt: 'desc' }],
        skip,
        take,
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          _count: {
            select: {
              messages: { where: { direction: MessageDirection.INBOUND } },
            },
          },
        },
      }),
      this.prisma.conversation.count({ where }),
    ]);

    const items: ConversationListItem[] = rows.map((row) => ({
      id: row.id,
      channel: row.channel,
      contactName: row.contactName,
      externalId: row.externalId,
      status: row.status,
      lastMessageAt: row.lastMessageAt,
      lastMessagePreview: row.messages[0]?.text ?? null,
      unreadCount: row._count.messages,
    }));

    return buildPaginatedResult(items, total, page, pageSize);
  }

  /**
   * GET /chats/conversations/:id/messages — paginated message history for a
   * conversation, newest first. 404 if the conversation does not exist.
   */
  async getMessages(
    conversationId: string,
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<Message>> {
    await this.getConversationOrThrow(conversationId);

    const { skip, take, page, pageSize } = toSkipTake(query);
    const where: Prisma.MessageWhereInput = { conversationId };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.message.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.message.count({ where }),
    ]);

    return buildPaginatedResult(items, total, page, pageSize);
  }

  // -------------------------------------------------------------------------
  // Writes
  // -------------------------------------------------------------------------

  /**
   * POST /chats/conversations/:id/messages — send an operator reply out to the
   * channel and persist it as an OUTBOUND message.
   *
   * Order of operations (resilient): resolve conversation → call Meta Graph
   * (never throws; may be skipped when unconfigured) → persist OUTBOUND with the
   * provider message id (if any) → bump lastMessageAt → emit realtime. The
   * message is persisted regardless of the Meta result so a reply is never lost.
   */
  async sendReply(
    conversationId: string,
    text: string,
    senderUserId: string,
  ): Promise<Message> {
    const conversation = await this.getConversationOrThrow(conversationId);

    const sendResult = await this.metaGraph.sendMessage(
      conversation.channel,
      conversation.externalId,
      text,
    );

    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderUserId,
        direction: MessageDirection.OUTBOUND,
        channel: conversation.channel,
        text,
        externalId: sendResult.externalId ?? null,
      },
    });

    const updatedConversation = await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: message.createdAt },
    });

    this.gateway.emitMessageNew(message);
    this.gateway.emitConversationUpdated(updatedConversation);

    return message;
  }

  /**
   * PATCH /chats/conversations/:id — move a conversation between
   * OPEN / PENDING / CLOSED. Emits the updated conversation for live inboxes.
   */
  async setStatus(
    conversationId: string,
    status: ConversationStatus,
  ): Promise<Conversation> {
    await this.getConversationOrThrow(conversationId);

    const conversation = await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { status },
    });

    this.gateway.emitConversationUpdated(conversation);
    return conversation;
  }

  // -------------------------------------------------------------------------
  // Webhook ingestion
  // -------------------------------------------------------------------------

  /**
   * Meta webhook verification (GET /chats/webhook). Echoes `hub.challenge`
   * when `hub.verify_token` matches the configured token. Returns `null` on a
   * mismatch so the controller can answer 403.
   */
  verifyWebhook(
    mode: string | undefined,
    token: string | undefined,
    challenge: string | undefined,
  ): string | null {
    const expected = this.config.get<string>('meta.verifyToken');
    if (mode === 'subscribe' && token && expected && token === expected) {
      return challenge ?? '';
    }
    this.logger.warn('Meta webhook verification failed (token mismatch).');
    return null;
  }

  /**
   * Ingest an inbound WhatsApp / Instagram webhook payload. Parses the Meta
   * envelope, and for each inbound message: upserts the Conversation by
   * (channel, externalId), appends an INBOUND Message, bumps lastMessageAt, and
   * emits realtime events. Malformed / status-only / echo payloads are ignored
   * (no throw) so Meta always receives a 200.
   */
  async ingestWebhook(payload: unknown): Promise<void> {
    const parsed = this.parseWebhook(payload);
    if (parsed.length === 0) {
      return;
    }

    for (const inbound of parsed) {
      try {
        await this.persistInbound(inbound);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Failed to persist inbound ${inbound.channel} message from ${inbound.externalId}: ${message}`,
        );
      }
    }
  }

  private async persistInbound(inbound: ParsedInboundMessage): Promise<void> {
    const now = new Date();

    const conversation = await this.prisma.conversation.upsert({
      where: {
        channel_externalId: {
          channel: inbound.channel,
          externalId: inbound.externalId,
        },
      },
      create: {
        channel: inbound.channel,
        externalId: inbound.externalId,
        contactName: inbound.contactName ?? null,
        status: ConversationStatus.OPEN,
        lastMessageAt: now,
      },
      update: {
        lastMessageAt: now,
        // Reopen a previously-closed thread when the contact writes again.
        status: ConversationStatus.OPEN,
        // Backfill the contact name if we learn it and didn't have one.
        ...(inbound.contactName ? { contactName: inbound.contactName } : {}),
      },
    });

    const message = await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        direction: MessageDirection.INBOUND,
        channel: inbound.channel,
        text: inbound.text ?? null,
        externalId: inbound.externalMessageId ?? null,
        createdAt: inbound.timestamp ?? now,
      },
    });

    this.gateway.emitMessageNew(message);
    this.gateway.emitConversationUpdated(conversation);
  }

  // -------------------------------------------------------------------------
  // Webhook parsing (Meta WhatsApp Cloud + Instagram/Messenger envelopes)
  // -------------------------------------------------------------------------

  /**
   * Normalise a Meta webhook body into a flat list of inbound messages.
   * Supports both the WhatsApp Cloud shape (`entry[].changes[].value.messages`)
   * and the Instagram/Messenger shape (`entry[].messaging[].message`). Anything
   * unrecognised (status callbacks, echoes, empty bodies) yields an empty list.
   */
  private parseWebhook(payload: unknown): ParsedInboundMessage[] {
    if (!isRecord(payload)) {
      return [];
    }

    const entries = asArray(payload.entry);
    const result: ParsedInboundMessage[] = [];

    for (const entry of entries) {
      if (!isRecord(entry)) {
        continue;
      }

      // WhatsApp Cloud: entry[].changes[].value.{ messages, contacts }
      for (const change of asArray(entry.changes)) {
        if (!isRecord(change)) {
          continue;
        }
        result.push(...this.parseWhatsAppChange(change.value));
      }

      // Instagram / Messenger: entry[].messaging[].{ sender, message, timestamp }
      for (const event of asArray(entry.messaging)) {
        const parsed = this.parseInstagramEvent(event);
        if (parsed) {
          result.push(parsed);
        }
      }
    }

    return result;
  }

  private parseWhatsAppChange(value: unknown): ParsedInboundMessage[] {
    if (!isRecord(value)) {
      return [];
    }

    const messages = asArray(value.messages);
    if (messages.length === 0) {
      return [];
    }

    // Contacts array carries the display name + wa_id per sender.
    const contactName = this.pickWhatsAppContactName(value.contacts);

    const result: ParsedInboundMessage[] = [];
    for (const raw of messages) {
      if (!isRecord(raw)) {
        continue;
      }
      const from = asString(raw.from);
      if (!from) {
        continue;
      }
      result.push({
        channel: MessageChannel.WHATSAPP,
        externalId: from,
        externalMessageId: asString(raw.id),
        contactName,
        text: this.pickWhatsAppText(raw),
        timestamp: parseUnixSeconds(raw.timestamp),
      });
    }
    return result;
  }

  private parseInstagramEvent(event: unknown): ParsedInboundMessage | null {
    if (!isRecord(event)) {
      return null;
    }

    const message = event.message;
    if (!isRecord(message)) {
      return null;
    }
    // Ignore echoes of our own outbound sends.
    if (message.is_echo === true) {
      return null;
    }

    const sender = isRecord(event.sender) ? asString(event.sender.id) : undefined;
    if (!sender) {
      return null;
    }

    return {
      channel: MessageChannel.INSTAGRAM,
      externalId: sender,
      externalMessageId: asString(message.mid),
      contactName: undefined,
      text: asString(message.text),
      timestamp: parseUnixMillis(event.timestamp),
    };
  }

  private pickWhatsAppText(raw: Record<string, unknown>): string | undefined {
    const body = isRecord(raw.text) ? asString(raw.text.body) : undefined;
    if (body) {
      return body;
    }
    // Fall back to a caption on media messages, or the button/interactive text.
    if (isRecord(raw.button)) {
      return asString(raw.button.text);
    }
    if (isRecord(raw.image)) {
      return asString(raw.image.caption);
    }
    if (isRecord(raw.video)) {
      return asString(raw.video.caption);
    }
    return undefined;
  }

  private pickWhatsAppContactName(contacts: unknown): string | undefined {
    for (const contact of asArray(contacts)) {
      if (isRecord(contact) && isRecord(contact.profile)) {
        const name = asString(contact.profile.name);
        if (name) {
          return name;
        }
      }
    }
    return undefined;
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  private async getConversationOrThrow(id: string): Promise<Conversation> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id },
    });
    if (!conversation) {
      throw new NotFoundException(`Conversation ${id} not found`);
    }
    return conversation;
  }
}

/** A single inbound message extracted from a Meta webhook payload. */
interface ParsedInboundMessage {
  channel: MessageChannel;
  externalId: string;
  externalMessageId?: string;
  contactName?: string;
  text?: string;
  timestamp?: Date;
}

// ---------------------------------------------------------------------------
// Small, defensive JSON accessors (webhook bodies are untyped external input).
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/** Meta WhatsApp timestamps are unix seconds encoded as a string. */
function parseUnixSeconds(value: unknown): Date | undefined {
  const raw = typeof value === 'string' ? value : String(value ?? '');
  const seconds = Number(raw);
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return undefined;
  }
  return new Date(seconds * 1000);
}

/** Messenger/Instagram timestamps are unix milliseconds (number). */
function parseUnixMillis(value: unknown): Date | undefined {
  const millis = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(millis) || millis <= 0) {
    return undefined;
  }
  return new Date(millis);
}
