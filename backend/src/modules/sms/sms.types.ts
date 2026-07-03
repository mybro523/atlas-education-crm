/**
 * Result of an attempt to send one SMS through a provider.
 *
 * `status` semantics:
 * - `SENT`    — the provider accepted the message.
 * - `FAILED`  — the provider rejected it or the HTTP call errored.
 * - `SKIPPED` — sending was a no-op (e.g. the provider is not configured /
 *   API key empty). This is NOT a failure: the app is simply not wired to a
 *   real SMS gateway yet and must keep working.
 */
export type SmsSendStatus = 'SENT' | 'FAILED' | 'SKIPPED';

export interface SmsSendResult {
  status: SmsSendStatus;
  /** Provider-side message id, when available. */
  providerMessageId?: string;
  /** Human-readable error / skip reason (for logging + Notification.error). */
  error?: string;
}

/**
 * Abstraction over an SMS gateway. Implementations MUST never throw for a
 * missing configuration or a transport error — they resolve to a
 * `FAILED`/`SKIPPED` result instead, so a single bad number never crashes a
 * broadcast or the absence cron.
 */
export interface SmsProvider {
  /** Stable provider name, for logs. */
  readonly name: string;
  send(phone: string, text: string): Promise<SmsSendResult>;
}

/** DI token for the active {@link SmsProvider} implementation. */
export const SMS_PROVIDER = 'SMS_PROVIDER';
