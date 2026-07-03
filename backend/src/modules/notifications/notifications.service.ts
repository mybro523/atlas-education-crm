import { Inject, Injectable, Logger, OnModuleInit, Optional } from '@nestjs/common';
import {
  Notification,
  NotificationChannel,
  NotificationStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SmsService } from '../sms/sms.service';
import {
  PaginatedResult,
  buildPaginatedResult,
  toSkipTake,
} from '../../common/dto/pagination.dto';
import { QueryNotificationsDto } from './dto/query-notifications.dto';
import { TELEGRAM_SENDER, TelegramSender } from './telegram-sender.interface';
import { NotificationsQueue } from './notifications.queue';

/**
 * Input to {@link NotificationsService.dispatch}. Either a `userId` (from which
 * a Telegram chat / SMS phone can be resolved) or an explicit `phone` /
 * `telegramChatId` recipient must ultimately be resolvable for delivery; when
 * nothing is resolvable the notification is still recorded and marked FAILED.
 */
export interface DispatchInput {
  /** Owning user, if any (links the Notification row + resolves recipient). */
  userId?: string | null;
  /** Explicit recipient (phone for SMS, chatId for Telegram). */
  recipient?: string | null;
  channel: NotificationChannel;
  /** Template key (e.g. absence_3_lessons) recorded for dedup / audit. */
  template?: string | null;
  /** Final, already-localized message body to deliver. */
  text: string;
  /** Optional structured payload persisted as JSON string for audit. */
  payload?: Record<string, unknown> | null;
}

/**
 * Central notification dispatcher.
 *
 * Every dispatch records a {@link Notification} row (status PENDING) FIRST, so
 * there is always an audit trail even if delivery later fails. Delivery is then
 * either enqueued on the BullMQ 'notifications' queue (when Redis is reachable)
 * or performed synchronously (fallback). The worker / direct path calls
 * {@link deliver}, which sends via SMS or Telegram and flips the row to
 * SENT / FAILED (SKIPPED provider results are recorded as SENT with an `error`
 * note, since a no-op is not a delivery failure of our system).
 *
 * RESILIENCE: no path throws for a missing provider key, a dead Redis, or a bad
 * recipient — failures are logged and recorded on the row.
 */
@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sms: SmsService,
    private readonly queue: NotificationsQueue,
    @Optional()
    @Inject(TELEGRAM_SENDER)
    private readonly telegram?: TelegramSender,
  ) {}

  async onModuleInit(): Promise<void> {
    // Wire the queue worker to our delivery path. If Redis is unreachable the
    // queue stays disabled and dispatch() falls back to synchronous delivery.
    await this.queue.init(async ({ notificationId }) => {
      await this.deliver(notificationId);
    });
  }

  // -------------------------------------------------------------------------
  // Dispatch
  // -------------------------------------------------------------------------

  /**
   * Record + deliver a notification. Returns the persisted row (with its final
   * status when delivered synchronously, or PENDING when queued).
   */
  async dispatch(input: DispatchInput): Promise<Notification> {
    const recipient = await this.resolveRecipient(input);

    const notification = await this.prisma.notification.create({
      data: {
        userId: input.userId ?? null,
        channel: input.channel,
        status: NotificationStatus.PENDING,
        template: input.template ?? null,
        recipient: recipient ?? null,
        payload: this.serializePayload(input.text, input.payload),
      },
    });

    // Prefer the queue; fall back to synchronous delivery when it's unavailable.
    const queued = await this.queue.enqueue({ notificationId: notification.id });
    if (queued) {
      return notification;
    }

    return this.deliver(notification.id);
  }

  /**
   * Deliver a previously-recorded notification by id and update its status.
   * Idempotent-ish: only acts on rows still PENDING (a re-run of an already
   * SENT/FAILED row is a no-op returning the current state).
   */
  async deliver(notificationId: string): Promise<Notification> {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });
    if (!notification) {
      throw new Error(`Notification ${notificationId} not found`);
    }
    if (notification.status !== NotificationStatus.PENDING) {
      return notification;
    }

    const text = this.readText(notification.payload);
    const recipient = (notification.recipient ?? '').trim();

    if (!recipient) {
      return this.markFailed(notificationId, 'No recipient resolved');
    }
    if (!text) {
      return this.markFailed(notificationId, 'Empty notification text');
    }

    try {
      if (notification.channel === NotificationChannel.SMS) {
        const result = await this.sms.send(recipient, text);
        if (result.status === 'FAILED') {
          return this.markFailed(notificationId, result.error ?? 'SMS failed');
        }
        // SENT or SKIPPED (no-op) — both mean our system did its job.
        return this.markSent(notificationId, result.error);
      }

      // TELEGRAM
      if (!this.telegram) {
        return this.markFailed(
          notificationId,
          'Telegram sender not available (module not wired / bot token empty)',
        );
      }
      const ok = await this.telegram.sendMessage(recipient, text);
      if (ok === false) {
        return this.markFailed(notificationId, 'Telegram delivery failed');
      }
      return this.markSent(notificationId);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Delivery of notification ${notificationId} threw: ${message}`,
      );
      return this.markFailed(notificationId, message);
    }
  }

  // -------------------------------------------------------------------------
  // Recipient resolution
  // -------------------------------------------------------------------------

  /**
   * Resolve the concrete recipient string for a dispatch: an explicit
   * `recipient` always wins; otherwise it is derived from the user's
   * telegramChatId (TELEGRAM) or phone (SMS).
   */
  private async resolveRecipient(
    input: DispatchInput,
  ): Promise<string | null> {
    const explicit = (input.recipient ?? '').trim();
    if (explicit) {
      return explicit;
    }
    if (!input.userId) {
      return null;
    }
    const user = await this.prisma.user.findUnique({
      where: { id: input.userId },
      select: { phone: true, telegramChatId: true },
    });
    if (!user) {
      return null;
    }
    if (input.channel === NotificationChannel.TELEGRAM) {
      return (user.telegramChatId ?? '').trim() || null;
    }
    return (user.phone ?? '').trim() || null;
  }

  // -------------------------------------------------------------------------
  // Status helpers
  // -------------------------------------------------------------------------

  private markSent(id: string, note?: string): Promise<Notification> {
    return this.prisma.notification.update({
      where: { id },
      data: {
        status: NotificationStatus.SENT,
        sentAt: new Date(),
        error: note ? note.slice(0, 500) : null,
      },
    });
  }

  private markFailed(id: string, error: string): Promise<Notification> {
    return this.prisma.notification.update({
      where: { id },
      data: {
        status: NotificationStatus.FAILED,
        error: error.slice(0, 500),
      },
    });
  }

  // -------------------------------------------------------------------------
  // Payload (de)serialization — Notification.payload is a String column.
  // We stash the message text plus any structured payload as JSON.
  // -------------------------------------------------------------------------

  private serializePayload(
    text: string,
    payload?: Record<string, unknown> | null,
  ): string {
    return JSON.stringify({ text, ...(payload ? { data: payload } : {}) });
  }

  private readText(payload: string | null): string {
    if (!payload) {
      return '';
    }
    try {
      const parsed: unknown = JSON.parse(payload);
      if (parsed && typeof parsed === 'object' && 'text' in parsed) {
        const t = (parsed as { text?: unknown }).text;
        return typeof t === 'string' ? t : '';
      }
    } catch {
      // Legacy / plain-text payload — use as-is.
      return payload;
    }
    return '';
  }

  // -------------------------------------------------------------------------
  // History
  // -------------------------------------------------------------------------

  /** Paginated notification history with optional channel / status filters. */
  async findAll(
    query: QueryNotificationsDto,
  ): Promise<PaginatedResult<Notification>> {
    const { skip, take, page, pageSize } = toSkipTake(query);
    const where: Prisma.NotificationWhereInput = {};
    if (query.channel) {
      where.channel = query.channel;
    }
    if (query.status) {
      where.status = query.status;
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return buildPaginatedResult(items, total, page, pageSize);
  }
}
