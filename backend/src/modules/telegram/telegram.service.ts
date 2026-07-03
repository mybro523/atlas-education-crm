import { Injectable } from '@nestjs/common';
import type { TelegramSender } from '../notifications/telegram-sender.interface';
import { TelegramProvider } from './telegram.provider';

/**
 * Public surface of the Telegram module for the rest of the app.
 *
 * NotificationsService injects this (via the TELEGRAM_SENDER token) to deliver
 * notifications over Telegram. It delegates to {@link TelegramProvider}, which
 * owns the Telegraf instance and is fully resilient to an empty token / send
 * failure (returns `false`, never throws). The caller records the Notification
 * row based on the boolean result.
 */
@Injectable()
export class TelegramService implements TelegramSender {
  constructor(private readonly provider: TelegramProvider) {}

  /** True when a bot token is configured and the bot was constructed. */
  isEnabled(): boolean {
    return this.provider.isEnabled();
  }

  /**
   * Deliver a text message to a Telegram chat. Resolves `true` on success and
   * `false` when the bot is disabled or the send failed. Never throws.
   */
  sendMessage(chatId: string, text: string): Promise<boolean> {
    return this.provider.sendMessage(chatId, text);
  }
}
