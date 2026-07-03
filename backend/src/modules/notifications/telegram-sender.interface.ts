/**
 * Minimal contract the Telegram module must satisfy for notifications to be
 * delivered over Telegram.
 *
 * The Telegram module (owned by another agent) is expected to register a
 * provider under the {@link TELEGRAM_SENDER} token — typically its
 * `TelegramService`/`TelegramProvider`, which already exposes
 * `sendMessage(chatId, text)`. NotificationsService injects it with
 * `@Optional()`, so when Telegram is not wired (or its bot token is empty) the
 * TELEGRAM channel simply degrades to a SKIPPED notification instead of
 * crashing.
 */
export interface TelegramSender {
  /**
   * Deliver a text message to a Telegram chat. Implementations MUST be
   * resilient (no throw on empty token / transport error) and should return
   * `false` when the message could not be delivered.
   */
  sendMessage(chatId: string, text: string): Promise<boolean | void>;
}

/** DI token a Telegram module binds to its sender implementation. */
export const TELEGRAM_SENDER = 'TELEGRAM_SENDER';
