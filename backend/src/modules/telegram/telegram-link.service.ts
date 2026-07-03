import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { TelegramProvider } from './telegram.provider';

/** Claims embedded in a Telegram link code. */
interface LinkCodePayload {
  /** User to bind on /start. */
  uid: string;
  /** Discriminator so an access token can never be reused as a link code. */
  purpose: 'tg-link';
}

/** Response of {@link TelegramLinkService.initLink}. */
export interface LinkInitResult {
  /** Signed short-lived code to pass as the /start payload. */
  code: string;
  /** Ready-to-open deep link: https://t.me/<bot>?start=<code>. */
  deepLink: string;
}

/** Response of {@link TelegramLinkService.status}. */
export interface LinkStatusResult {
  linked: boolean;
  telegramChatId?: string;
}

/**
 * Manages the account <-> Telegram chat binding WITHOUT any schema change.
 *
 * A link "code" is a short-lived JWT signed with the access secret, carrying
 * only the userId and a `purpose` discriminator. The bot verifies it on
 * /start and writes the sender's chatId onto the User row. status() and
 * unlink() read/clear User.telegramChatId.
 */
@Injectable()
export class TelegramLinkService {
  private readonly logger = new Logger(TelegramLinkService.name);
  /** Codes are single-use-ish and short-lived; 15 minutes is plenty to scan. */
  private static readonly CODE_TTL = '15m';

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly provider: TelegramProvider,
  ) {}

  private get secret(): string {
    return this.config.get<string>('jwt.accessSecret') ?? 'dev_access_secret';
  }

  /**
   * Issue a link code + deep link for the given user.
   *
   * The deep link's bot username comes from the launched bot when available,
   * else falls back to the TELEGRAM_BOT_USERNAME env var, else a placeholder —
   * the code itself is always valid regardless of how the user opens the bot.
   */
  async initLink(userId: string): Promise<LinkInitResult> {
    const payload: LinkCodePayload = { uid: userId, purpose: 'tg-link' };
    const code = await this.jwt.signAsync(payload, {
      secret: this.secret,
      expiresIn: TelegramLinkService.CODE_TTL,
    });

    const username = this.resolveBotUsername();
    const deepLink = `https://t.me/${username}?start=${encodeURIComponent(code)}`;
    return { code, deepLink };
  }

  /**
   * Verify a /start payload code and return the userId it binds to, or null if
   * the code is invalid / expired / not a link code. Never throws.
   */
  async verifyCode(code: string): Promise<string | null> {
    const value = (code ?? '').trim();
    if (!value) {
      return null;
    }
    try {
      const payload = await this.jwt.verifyAsync<LinkCodePayload>(value, {
        secret: this.secret,
      });
      if (payload?.purpose !== 'tg-link' || !payload.uid) {
        return null;
      }
      return payload.uid;
    } catch {
      // Expired or tampered code — treat as invalid, no crash.
      return null;
    }
  }

  /**
   * Bind a chatId to a user. Returns true on success. Because
   * User.telegramChatId is unique, if the chat is already bound to a DIFFERENT
   * user we first release it, so re-linking a device can never crash.
   */
  async bindChat(userId: string, chatId: string): Promise<boolean> {
    const chat = (chatId ?? '').trim();
    if (!userId || !chat) {
      return false;
    }
    try {
      // Ensure the target user still exists.
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
      });
      if (!user) {
        return false;
      }

      await this.prisma.$transaction([
        // Release this chatId from any other user (unique constraint safety).
        this.prisma.user.updateMany({
          where: { telegramChatId: chat, NOT: { id: userId } },
          data: { telegramChatId: null },
        }),
        this.prisma.user.update({
          where: { id: userId },
          data: { telegramChatId: chat },
        }),
      ]);
      return true;
    } catch (err) {
      this.logger.error(
        `Failed to bind chat ${chat} to user ${userId}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      return false;
    }
  }

  /** Current link status for a user. */
  async status(userId: string): Promise<LinkStatusResult> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { telegramChatId: true },
    });
    const chatId = user?.telegramChatId ?? null;
    return chatId
      ? { linked: true, telegramChatId: chatId }
      : { linked: false };
  }

  /** Clear the user's Telegram binding. Idempotent. */
  async unlink(userId: string): Promise<LinkStatusResult> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { telegramChatId: null },
    });
    return { linked: false };
  }

  /**
   * Resolve the bot username for deep links: prefer the live value discovered
   * after launch, then TELEGRAM_BOT_USERNAME env, then a safe placeholder.
   */
  private resolveBotUsername(): string {
    const live = this.provider.getBotUsername();
    if (live) {
      return live;
    }
    const configured = (
      this.config.get<string>('telegram.botUsername') ??
      process.env.TELEGRAM_BOT_USERNAME ??
      ''
    ).trim();
    return configured || 'atlaaas1_bot';
  }
}
