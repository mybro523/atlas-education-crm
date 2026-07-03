import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Telegraf } from 'telegraf';
import type { TelegramSender } from '../notifications/telegram-sender.interface';

/**
 * Owns the raw Telegraf bot instance and its lifecycle.
 *
 * RESILIENCE: if TELEGRAM_BOT_TOKEN is empty the bot is never created — the
 * module still boots and {@link sendMessage} becomes a logged no-op that
 * returns `false`. Any transport error while sending is swallowed (logged) and
 * surfaced as `false`; the caller (NotificationsService) is responsible for
 * recording the Notification row.
 *
 * The bot is created here but LAUNCHED by {@link TelegramBotService} after it
 * has registered its command handlers, so long polling never delivers updates
 * before handlers exist.
 */
@Injectable()
export class TelegramProvider implements TelegramSender {
  private readonly logger = new Logger(TelegramProvider.name);
  private bot: Telegraf | null = null;
  /** Bot @username, resolved once after launch; used to build deep links. */
  private botUsername: string | null = null;
  private warnedNoToken = false;

  constructor(private readonly config: ConfigService) {
    const token = this.token;
    if (!token) {
      this.logger.warn(
        'TELEGRAM_BOT_TOKEN is empty — Telegram bot is disabled. ' +
          'sendMessage() is a no-op and the bot will not be launched.',
      );
      return;
    }
    try {
      this.bot = new Telegraf(token);
    } catch (err) {
      // A malformed token can throw synchronously; never let it break boot.
      this.bot = null;
      this.logger.error(
        `Failed to construct Telegraf bot: ${this.errMessage(err)}`,
      );
    }
  }

  private get token(): string {
    return (this.config.get<string>('telegram.botToken') ?? '').trim();
  }

  /** True when a bot instance exists (token was present and valid). */
  isEnabled(): boolean {
    return this.bot !== null;
  }

  /** The underlying Telegraf instance, or null when disabled. */
  getBot(): Telegraf | null {
    return this.bot;
  }

  /** Resolved bot @username (without @), if the bot has been launched. */
  getBotUsername(): string | null {
    return this.botUsername;
  }

  setBotUsername(username: string | null): void {
    this.botUsername = username;
  }

  /**
   * Send a text message to a Telegram chat.
   *
   * Never throws. Returns `true` on success, `false` when the bot is disabled,
   * the chatId is empty, or the Telegram API rejects the send. The caller owns
   * recording the resulting Notification status.
   */
  async sendMessage(chatId: string, text: string): Promise<boolean> {
    if (!this.bot) {
      if (!this.warnedNoToken) {
        this.logger.warn(
          'sendMessage() called but Telegram bot is disabled (no token) — skipping.',
        );
        this.warnedNoToken = true;
      }
      return false;
    }

    const to = (chatId ?? '').trim();
    if (!to) {
      this.logger.warn('sendMessage() called with an empty chatId — skipping.');
      return false;
    }

    try {
      await this.bot.telegram.sendMessage(to, text);
      return true;
    } catch (err) {
      this.logger.warn(
        `Telegram sendMessage to ${to} failed: ${this.errMessage(err)}`,
      );
      return false;
    }
  }

  private errMessage(err: unknown): string {
    return err instanceof Error ? err.message : String(err);
  }
}
