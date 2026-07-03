/**
 * Telegram account-linking types (INTEGRATION API — TELEGRAM LINK).
 * Available to any authenticated user.
 */

/** Response of POST /telegram/link/init. */
export interface TelegramLinkInit {
  /** Short one-time code the user passes to the bot (also embedded in deepLink). */
  code: string;
  /** Ready-to-open bot deep link: https://t.me/<botUsername>?start=<code>. */
  deepLink: string;
}

/** Response of GET /telegram/link/status. */
export interface TelegramLinkStatus {
  linked: boolean;
  /** Present only when linked. */
  telegramChatId?: string;
}
