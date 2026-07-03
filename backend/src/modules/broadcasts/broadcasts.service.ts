import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Broadcast, BroadcastAudience, BroadcastStatus, NotificationChannel } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  PaginatedResult,
  buildPaginatedResult,
  toSkipTake,
} from '../../common/dto/pagination.dto';
import { CreateBroadcastDto } from './dto/create-broadcast.dto';
import { QueryBroadcastsDto } from './dto/query-broadcasts.dto';

/**
 * SMS broadcasts (course announcements / greetings). A broadcast is persisted
 * first (status QUEUED), the endpoint returns immediately, and the actual fan-out
 * runs in the background: status QUEUED → SENDING → SENT/FAILED. Each recipient
 * SMS goes through {@link NotificationsService.dispatch}, which records a
 * Notification row and enqueues on BullMQ when Redis is available (otherwise
 * sends directly). RESILIENCE: a single bad number never aborts the batch, and a
 * missing SMS provider degrades to SKIPPED notifications, not a crash.
 */
@Injectable()
export class BroadcastsService {
  private readonly logger = new Logger(BroadcastsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Paginated broadcast history, newest first. */
  async findAll(
    query: QueryBroadcastsDto,
  ): Promise<PaginatedResult<Broadcast>> {
    const { skip, take, page, pageSize } = toSkipTake(query);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.broadcast.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.broadcast.count(),
    ]);
    return buildPaginatedResult(items, total, page, pageSize);
  }

  /** Single broadcast detail / status. */
  async findOne(id: string): Promise<Broadcast> {
    const broadcast = await this.prisma.broadcast.findUnique({ where: { id } });
    if (!broadcast) {
      throw new NotFoundException('Broadcast not found');
    }
    return broadcast;
  }

  /**
   * Create + enqueue a broadcast. Persists it as QUEUED, returns immediately,
   * and kicks off the fan-out in the background (status transitions observable
   * via GET /broadcasts/:id).
   */
  async create(
    dto: CreateBroadcastDto,
    authorId?: string | null,
  ): Promise<Broadcast> {
    const broadcast = await this.prisma.broadcast.create({
      data: {
        title: dto.title ?? null,
        text: dto.text,
        audience: dto.audience,
        status: BroadcastStatus.QUEUED,
        authorId: authorId ?? null,
      },
    });

    // Fire-and-forget: don't block the request on the whole fan-out. Errors are
    // captured onto the broadcast row (status FAILED) inside the runner.
    void this.run(broadcast.id, dto.text, dto.audience);

    return broadcast;
  }

  /**
   * Background runner: resolve recipients and dispatch SMS to each, updating the
   * broadcast status. Never throws (this is not awaited by the request).
   */
  private async run(
    broadcastId: string,
    text: string,
    audience: BroadcastAudience,
  ): Promise<void> {
    try {
      await this.prisma.broadcast.update({
        where: { id: broadcastId },
        data: { status: BroadcastStatus.SENDING },
      });

      const phones = await this.resolveRecipients(audience);

      for (const phone of phones) {
        try {
          await this.notifications.dispatch({
            recipient: phone,
            channel: NotificationChannel.SMS,
            template: 'broadcast',
            text,
            payload: { broadcastId },
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          this.logger.warn(
            `Broadcast ${broadcastId}: dispatch to ${phone} failed: ${message}`,
          );
        }
      }

      await this.prisma.broadcast.update({
        where: { id: broadcastId },
        data: { status: BroadcastStatus.SENT, sentAt: new Date() },
      });
      this.logger.log(
        `Broadcast ${broadcastId} sent to ${phones.length} recipient(s).`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Broadcast ${broadcastId} failed: ${message}`);
      try {
        await this.prisma.broadcast.update({
          where: { id: broadcastId },
          data: { status: BroadcastStatus.FAILED },
        });
      } catch {
        /* ignore: best-effort status update */
      }
    }
  }

  /**
   * Resolve the deduplicated set of recipient phone numbers for an audience.
   * ALL_STUDENTS → active students' phones; ALL_TEACHERS → teachers' phones;
   * BOTH → the union. Empty / null phones are dropped.
   */
  private async resolveRecipients(
    audience: BroadcastAudience,
  ): Promise<string[]> {
    const wantStudents =
      audience === BroadcastAudience.ALL_STUDENTS ||
      audience === BroadcastAudience.BOTH;
    const wantTeachers =
      audience === BroadcastAudience.ALL_TEACHERS ||
      audience === BroadcastAudience.BOTH;

    const phones = new Set<string>();

    if (wantStudents) {
      const students = await this.prisma.student.findMany({
        where: { isActive: true, phone: { not: null } },
        select: { phone: true },
      });
      for (const s of students) {
        const p = (s.phone ?? '').trim();
        if (p) {
          phones.add(p);
        }
      }
    }

    if (wantTeachers) {
      const teachers = await this.prisma.teacher.findMany({
        where: { phone: { not: null } },
        select: { phone: true },
      });
      for (const t of teachers) {
        const p = (t.phone ?? '').trim();
        if (p) {
          phones.add(p);
        }
      }
    }

    return Array.from(phones);
  }
}
