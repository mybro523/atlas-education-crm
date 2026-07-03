import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import type { Context } from 'telegraf';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '../../common/enums/role.enum';
import { TelegramProvider } from './telegram.provider';
import { TelegramLinkService } from './telegram-link.service';
import {
  normalizeLang,
  SupportedLang,
  tg,
} from './telegram.i18n';

/** Minimal shape of the linked user needed to answer bot commands. */
interface LinkedUser {
  id: string;
  role: string;
  lang: SupportedLang;
}

/**
 * Registers the bot's command handlers and drives long polling.
 *
 * Handlers are wired here (not in the provider) and the bot is launched in
 * onModuleInit AFTER wiring, so no update is processed before its handler
 * exists. Everything is wrapped so a Telegram/network hiccup or an empty token
 * never crashes app boot.
 *
 * Commands (/grades /schedule /performance) resolve the sender via
 * User.telegramChatId and query Prisma directly (same shapes as the journal
 * self services) to avoid a hard cross-module dependency.
 */
@Injectable()
export class TelegramBotService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramBotService.name);
  private launched = false;

  constructor(
    private readonly provider: TelegramProvider,
    private readonly links: TelegramLinkService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit(): Promise<void> {
    const bot = this.provider.getBot();
    if (!bot) {
      // Token empty / invalid — provider already logged. Nothing to launch.
      return;
    }

    try {
      this.registerHandlers();
    } catch (err) {
      this.logger.error(
        `Failed to register Telegram handlers: ${this.errMessage(err)}`,
      );
      return;
    }

    // Launch WITHOUT awaiting: telegraf's launch() resolves only when the bot
    // stops, so awaiting it would block bootstrap forever.
    try {
      void bot
        .launch()
        .then(() => {
          this.launched = true;
        })
        .catch((err: unknown) => {
          this.logger.error(
            `Telegram bot polling stopped/failed: ${this.errMessage(err)}`,
          );
        });

      // Best-effort: discover the bot username for deep links (non-fatal).
      void bot.telegram
        .getMe()
        .then((me) => {
          this.provider.setBotUsername(me.username ?? null);
          this.logger.log(`Telegram bot launched as @${me.username}`);
        })
        .catch((err: unknown) => {
          this.logger.warn(
            `Could not resolve bot username: ${this.errMessage(err)}`,
          );
        });
    } catch (err) {
      // launch() can throw synchronously on some misconfigurations.
      this.logger.error(
        `Telegram bot launch failed: ${this.errMessage(err)}`,
      );
    }
  }

  onModuleDestroy(): void {
    const bot = this.provider.getBot();
    if (bot && this.launched) {
      try {
        bot.stop('SIGTERM');
      } catch (err) {
        this.logger.warn(`Telegram bot stop failed: ${this.errMessage(err)}`);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Handler wiring
  // ---------------------------------------------------------------------------

  private registerHandlers(): void {
    const bot = this.provider.getBot();
    if (!bot) {
      return;
    }

    // /start [<code>] — bind the sender's chat to the coded user.
    bot.start((ctx) => this.safeHandle(ctx, () => this.onStart(ctx)));

    bot.command('help', (ctx) =>
      this.safeHandle(ctx, () => this.onHelp(ctx)),
    );
    bot.command('grades', (ctx) =>
      this.safeHandle(ctx, () => this.onGrades(ctx)),
    );
    bot.command('schedule', (ctx) =>
      this.safeHandle(ctx, () => this.onSchedule(ctx)),
    );
    bot.command('performance', (ctx) =>
      this.safeHandle(ctx, () => this.onPerformance(ctx)),
    );

    // Graceful stop on process signals (telegraf recommendation).
    process.once('SIGINT', () => this.onModuleDestroy());
    process.once('SIGTERM', () => this.onModuleDestroy());
  }

  /** Run a handler, converting any throw into a localized error reply. */
  private async safeHandle(
    ctx: Context,
    fn: () => Promise<void>,
  ): Promise<void> {
    try {
      await fn();
    } catch (err) {
      this.logger.error(`Telegram handler error: ${this.errMessage(err)}`);
      try {
        // We may not know the user's language here; default to ru.
        await ctx.reply(tg('error', 'ru'));
      } catch {
        // Replying can itself fail (blocked bot, etc.) — ignore.
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Commands
  // ---------------------------------------------------------------------------

  private async onStart(ctx: Context): Promise<void> {
    const code = this.extractStartPayload(ctx);
    const chatId = ctx.chat?.id;

    if (!code) {
      // Plain /start with no payload.
      const lang = await this.langForChat(chatId);
      await ctx.reply(tg('welcome', lang));
      return;
    }

    const userId = await this.links.verifyCode(code);
    if (!userId) {
      await ctx.reply(tg('linkInvalid', 'ru'));
      return;
    }

    if (chatId === undefined || chatId === null) {
      await ctx.reply(tg('error', 'ru'));
      return;
    }

    const bound = await this.links.bindChat(userId, String(chatId));
    if (!bound) {
      await ctx.reply(tg('linkUserGone', 'ru'));
      return;
    }

    const user = await this.loadUser(userId);
    await ctx.reply(tg('linkSuccess', user?.lang ?? 'ru'));
  }

  private async onHelp(ctx: Context): Promise<void> {
    const user = await this.resolveSender(ctx);
    await ctx.reply(tg('help', user?.lang ?? 'ru'));
  }

  private async onGrades(ctx: Context): Promise<void> {
    const user = await this.requireLinked(ctx);
    if (!user) {
      return;
    }
    if (user.role !== Role.STUDENT) {
      await ctx.reply(tg('gradesForStudentsOnly', user.lang));
      return;
    }

    const studentId = await this.studentIdForUser(user.id);
    if (!studentId) {
      await ctx.reply(tg('profileMissing', user.lang));
      return;
    }

    const grades = await this.prisma.grade.findMany({
      where: { studentId },
      select: {
        value: true,
        comment: true,
        createdAt: true,
        lesson: {
          select: {
            startsAt: true,
            group: { select: { subject: { select: { name: true } } } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    if (grades.length === 0) {
      await ctx.reply(tg('noGrades', user.lang));
      return;
    }

    const lines = grades.map((g) => {
      const subject = g.lesson.group.subject.name;
      const date = this.formatDate(g.lesson.startsAt ?? g.createdAt);
      const comment = g.comment ? ` — ${g.comment}` : '';
      return `• ${subject}: ${g.value} (${date})${comment}`;
    });

    await ctx.reply(`${tg('gradesHeader', user.lang)}\n${lines.join('\n')}`);
  }

  private async onSchedule(ctx: Context): Promise<void> {
    const user = await this.requireLinked(ctx);
    if (!user) {
      return;
    }

    const now = new Date();

    if (user.role === Role.TEACHER) {
      const teacherId = await this.teacherIdForUser(user.id);
      if (!teacherId) {
        await ctx.reply(tg('profileMissing', user.lang));
        return;
      }
      const lessons = await this.prisma.lesson.findMany({
        where: { teacherId, startsAt: { gte: now } },
        select: {
          startsAt: true,
          room: true,
          topic: true,
          group: {
            select: {
              name: true,
              subject: { select: { name: true } },
            },
          },
        },
        orderBy: { startsAt: 'asc' },
        take: 10,
      });
      if (lessons.length === 0) {
        await ctx.reply(tg('noSchedule', user.lang));
        return;
      }
      const lines = lessons.map((l) => this.formatLessonLine(l));
      await ctx.reply(
        `${tg('teacherScheduleHeader', user.lang)}\n${lines.join('\n')}`,
      );
      return;
    }

    if (user.role === Role.STUDENT) {
      const studentId = await this.studentIdForUser(user.id);
      if (!studentId) {
        await ctx.reply(tg('profileMissing', user.lang));
        return;
      }
      const lessons = await this.prisma.lesson.findMany({
        where: {
          startsAt: { gte: now },
          group: { students: { some: { studentId, leftAt: null } } },
        },
        select: {
          startsAt: true,
          room: true,
          topic: true,
          group: {
            select: {
              name: true,
              subject: { select: { name: true } },
            },
          },
        },
        orderBy: { startsAt: 'asc' },
        take: 10,
      });
      if (lessons.length === 0) {
        await ctx.reply(tg('noSchedule', user.lang));
        return;
      }
      const lines = lessons.map((l) => this.formatLessonLine(l));
      await ctx.reply(
        `${tg('scheduleHeader', user.lang)}\n${lines.join('\n')}`,
      );
      return;
    }

    // Other roles have no personal schedule.
    await ctx.reply(tg('noSchedule', user.lang));
  }

  private async onPerformance(ctx: Context): Promise<void> {
    const user = await this.requireLinked(ctx);
    if (!user) {
      return;
    }
    if (user.role !== Role.STUDENT) {
      await ctx.reply(tg('performanceForStudentsOnly', user.lang));
      return;
    }

    const studentId = await this.studentIdForUser(user.id);
    if (!studentId) {
      await ctx.reply(tg('profileMissing', user.lang));
      return;
    }

    const [grades, attendances] = await Promise.all([
      this.prisma.grade.findMany({
        where: { studentId },
        select: {
          value: true,
          lesson: {
            select: {
              group: { select: { subject: { select: { name: true } } } },
            },
          },
        },
      }),
      this.prisma.attendance.findMany({
        where: { studentId },
        select: {
          status: true,
          lesson: {
            select: {
              group: { select: { subject: { select: { name: true } } } },
            },
          },
        },
      }),
    ]);

    if (grades.length === 0 && attendances.length === 0) {
      await ctx.reply(tg('noPerformance', user.lang));
      return;
    }

    interface Acc {
      name: string;
      sum: number;
      count: number;
      absences: number;
    }
    const bySubject = new Map<string, Acc>();
    const ensure = (name: string): Acc => {
      let acc = bySubject.get(name);
      if (!acc) {
        acc = { name, sum: 0, count: 0, absences: 0 };
        bySubject.set(name, acc);
      }
      return acc;
    };

    let sumAll = 0;
    let countAll = 0;
    for (const g of grades) {
      const name = g.lesson.group.subject.name;
      const acc = ensure(name);
      acc.sum += g.value;
      acc.count += 1;
      sumAll += g.value;
      countAll += 1;
    }
    let totalAbsences = 0;
    for (const a of attendances) {
      const name = a.lesson.group.subject.name;
      const acc = ensure(name);
      if (a.status === 'ABSENT') {
        acc.absences += 1;
        totalAbsences += 1;
      }
    }

    const avgLabel = tg('average', user.lang);
    const absLabel = tg('absences', user.lang);
    const overallLabel = tg('overall', user.lang);

    const lines = Array.from(bySubject.values()).map((acc) => {
      const avg = acc.count > 0 ? (acc.sum / acc.count).toFixed(2) : '—';
      return `• ${acc.name}: ${avgLabel} ${avg}, ${absLabel} ${acc.absences}`;
    });

    const overallAvg = countAll > 0 ? (sumAll / countAll).toFixed(2) : '—';
    lines.push(
      `— ${overallLabel}: ${avgLabel} ${overallAvg}, ${absLabel} ${totalAbsences}`,
    );

    await ctx.reply(
      `${tg('performanceHeader', user.lang)}\n${lines.join('\n')}`,
    );
  }

  // ---------------------------------------------------------------------------
  // Sender resolution & data helpers
  // ---------------------------------------------------------------------------

  /**
   * Resolve the linked user, or reply "not linked" and return null. Use for
   * commands that require a bound account.
   */
  private async requireLinked(ctx: Context): Promise<LinkedUser | null> {
    const user = await this.resolveSender(ctx);
    if (!user) {
      await ctx.reply(tg('notLinked', 'ru'));
      return null;
    }
    return user;
  }

  /** Resolve the linked user from the chat, or null when not linked. */
  private async resolveSender(ctx: Context): Promise<LinkedUser | null> {
    const chatId = ctx.chat?.id;
    if (chatId === undefined || chatId === null) {
      return null;
    }
    return this.userForChat(String(chatId));
  }

  private async userForChat(chatId: string): Promise<LinkedUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { telegramChatId: chatId },
      select: { id: true, role: true, language: true },
    });
    if (!user) {
      return null;
    }
    return {
      id: user.id,
      role: user.role,
      lang: normalizeLang(user.language),
    };
  }

  private async loadUser(userId: string): Promise<LinkedUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, language: true },
    });
    if (!user) {
      return null;
    }
    return {
      id: user.id,
      role: user.role,
      lang: normalizeLang(user.language),
    };
  }

  private async langForChat(
    chatId: number | undefined,
  ): Promise<SupportedLang> {
    if (chatId === undefined || chatId === null) {
      return 'ru';
    }
    const user = await this.userForChat(String(chatId));
    return user?.lang ?? 'ru';
  }

  private async studentIdForUser(userId: string): Promise<string | null> {
    const student = await this.prisma.student.findUnique({
      where: { userId },
      select: { id: true },
    });
    return student?.id ?? null;
  }

  private async teacherIdForUser(userId: string): Promise<string | null> {
    const teacher = await this.prisma.teacher.findUnique({
      where: { userId },
      select: { id: true },
    });
    return teacher?.id ?? null;
  }

  // ---------------------------------------------------------------------------
  // Formatting
  // ---------------------------------------------------------------------------

  private formatLessonLine(lesson: {
    startsAt: Date;
    room: string | null;
    topic: string | null;
    group: { name: string; subject: { name: string } };
  }): string {
    const when = this.formatDateTime(lesson.startsAt);
    const subject = lesson.group.subject.name;
    const group = lesson.group.name;
    const room = lesson.room ? `, ${lesson.room}` : '';
    const topic = lesson.topic ? ` — ${lesson.topic}` : '';
    return `• ${when}: ${subject} (${group}${room})${topic}`;
  }

  private formatDate(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private formatDateTime(date: Date): string {
    // YYYY-MM-DD HH:mm (UTC) — locale-agnostic and stable.
    const iso = date.toISOString();
    return `${iso.slice(0, 10)} ${iso.slice(11, 16)}`;
  }

  /**
   * Extract the /start payload (the "<code>" in `/start <code>`), supporting
   * both the message text and telegraf's parsed `startPayload`.
   */
  private extractStartPayload(ctx: Context): string {
    // telegraf populates ctx.startPayload for deep-link starts.
    const parsed = (ctx as unknown as { startPayload?: string }).startPayload;
    if (parsed && parsed.length > 0) {
      return parsed.trim();
    }
    const message = ctx.message;
    if (message && 'text' in message && typeof message.text === 'string') {
      const parts = message.text.trim().split(/\s+/);
      if (parts.length > 1) {
        return parts.slice(1).join(' ').trim();
      }
    }
    return '';
  }

  private errMessage(err: unknown): string {
    return err instanceof Error ? err.message : String(err);
  }
}
