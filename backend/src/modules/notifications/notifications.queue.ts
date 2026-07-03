import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ConnectionOptions, Job, Queue, Worker } from 'bullmq';

/**
 * Shape of a single notification job carried through the BullMQ queue. It mirrors
 * the arguments of {@link NotificationsService.dispatch} so the worker can just
 * re-invoke the direct-send path.
 */
export interface NotificationJobData {
  notificationId: string;
}

/** Handler the service registers to actually deliver a queued notification. */
export type NotificationJobHandler = (
  data: NotificationJobData,
) => Promise<void>;

const QUEUE_NAME = 'notifications';

/**
 * Resilient BullMQ wrapper for the notifications pipeline.
 *
 * RESILIENCE (HARD RULE): constructing this MUST NOT throw or crash boot when
 * Redis is unavailable or REDIS_* is unset. We create the ioredis connection
 * with `lazyConnect` + `maxRetriesPerRequest: null` and a bounded reconnect
 * strategy, attempt a single ping, and if it fails we mark the queue disabled so
 * callers fall back to direct sending. Nothing here is created during module
 * construction that can reject the app bootstrap.
 */
@Injectable()
export class NotificationsQueue implements OnModuleDestroy {
  private readonly logger = new Logger(NotificationsQueue.name);

  private queue?: Queue<NotificationJobData>;
  private worker?: Worker<NotificationJobData>;
  private connection?: import('ioredis').Redis;
  private ready = false;
  private initialized = false;

  constructor(private readonly config: ConfigService) {}

  /** True once a live queue is connected and accepting jobs. */
  isReady(): boolean {
    return this.ready;
  }

  /**
   * Lazily initialize the queue + worker. Safe to call repeatedly; only the
   * first successful call wires things up. Returns whether the queue is usable.
   *
   * The `handler` is invoked by the worker for each dequeued job. Any error in
   * initialization is swallowed (logged) and the queue is left disabled.
   */
  async init(handler: NotificationJobHandler): Promise<boolean> {
    if (this.initialized) {
      return this.ready;
    }
    this.initialized = true;

    const host = (this.config.get<string>('redis.host') ?? '').trim();
    const port = this.config.get<number>('redis.port');
    if (!host || !port) {
      this.logger.warn(
        'Redis not configured (REDIS_HOST / REDIS_PORT) — notifications will be delivered synchronously (no queue).',
      );
      return false;
    }

    try {
      // Dynamic imports so a missing/broken dependency cannot break module load.
      const { Queue, Worker } = await import('bullmq');
      const IORedis = (await import('ioredis')).default;

      this.connection = new IORedis({
        host,
        port,
        // BullMQ requires this to be null for blocking commands.
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        lazyConnect: true,
        // Bounded reconnects: give up after a few tries instead of hammering a
        // dead Redis forever.
        retryStrategy: (times: number) =>
          times > 5 ? null : Math.min(times * 200, 2000),
      });
      // Don't let connection errors bubble as unhandled 'error' events.
      this.connection.on('error', (err: Error) => {
        this.logger.warn(`Redis connection error: ${err.message}`);
      });

      // Probe connectivity once; if Redis is down this rejects and we degrade.
      await this.connection.connect();
      await this.connection.ping();

      // bullmq bundles its own ioredis copy whose type identity differs from the
      // top-level ioredis; the runtime instance is compatible, so bridge the
      // two nominal types at this boundary.
      const connection = this.connection as unknown as ConnectionOptions;

      this.queue = new Queue<NotificationJobData>(QUEUE_NAME, {
        connection,
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: 1000,
          removeOnFail: 5000,
        },
      });

      this.worker = new Worker<NotificationJobData>(
        QUEUE_NAME,
        async (job: Job<NotificationJobData>) => {
          await handler(job.data);
        },
        { connection, concurrency: 5 },
      );
      this.worker.on('failed', (job, err) => {
        this.logger.warn(
          `Notification job ${job?.id ?? '?'} failed: ${err?.message}`,
        );
      });

      this.ready = true;
      this.logger.log(
        `Notifications BullMQ queue connected (${host}:${port}).`,
      );
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Could not start notifications queue (${message}) — falling back to synchronous delivery.`,
      );
      await this.safeTeardown();
      this.ready = false;
      return false;
    }
  }

  /**
   * Enqueue a notification job. Returns true if it was accepted by the queue,
   * false when the queue is unavailable (caller should send directly).
   */
  async enqueue(data: NotificationJobData): Promise<boolean> {
    if (!this.ready || !this.queue) {
      return false;
    }
    try {
      await this.queue.add('send', data);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Failed to enqueue notification: ${message}`);
      return false;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.safeTeardown();
  }

  private async safeTeardown(): Promise<void> {
    try {
      await this.worker?.close();
    } catch {
      /* ignore */
    }
    try {
      await this.queue?.close();
    } catch {
      /* ignore */
    }
    try {
      this.connection?.disconnect();
    } catch {
      /* ignore */
    }
    this.worker = undefined;
    this.queue = undefined;
    this.connection = undefined;
  }
}
