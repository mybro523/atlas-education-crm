import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SmsProvider, SmsSendResult } from './sms.types';

/**
 * payom.tj SMS gateway implementation.
 *
 * Uses the global `fetch` (Node 24) — no axios. RESILIENCE: if the API key or
 * URL is not configured, {@link send} logs once and returns a `SKIPPED` result
 * instead of throwing, so broadcasts / absence alerts degrade to no-ops in dev
 * (and on Railway before payom is wired) rather than crashing.
 */
@Injectable()
export class PayomTjProvider implements SmsProvider {
  readonly name = 'payom.tj';
  private readonly logger = new Logger(PayomTjProvider.name);
  private warnedNotConfigured = false;

  constructor(private readonly config: ConfigService) {}

  private get apiUrl(): string {
    return (this.config.get<string>('sms.apiUrl') ?? '').trim();
  }

  private get apiKey(): string {
    return (this.config.get<string>('sms.apiKey') ?? '').trim();
  }

  private get sender(): string {
    return (this.config.get<string>('sms.sender') ?? 'AtlasCRM').trim();
  }

  /** True when both endpoint and key are present. */
  isConfigured(): boolean {
    return this.apiUrl.length > 0 && this.apiKey.length > 0;
  }

  async send(phone: string, text: string): Promise<SmsSendResult> {
    const to = (phone ?? '').trim();
    if (!to) {
      return { status: 'FAILED', error: 'Empty recipient phone' };
    }

    if (!this.isConfigured()) {
      if (!this.warnedNotConfigured) {
        this.logger.warn(
          'payom.tj is not configured (PAYOM_TJ_API_URL / PAYOM_TJ_API_KEY empty) — SMS sending is disabled, messages will be recorded as SKIPPED.',
        );
        this.warnedNotConfigured = true;
      }
      return { status: 'SKIPPED', error: 'SMS provider not configured' };
    }

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          sender: this.sender,
          recipient: to,
          text,
        }),
      });

      if (!response.ok) {
        const bodyText = await this.safeReadText(response);
        this.logger.warn(
          `payom.tj rejected SMS to ${to}: HTTP ${response.status} ${bodyText}`,
        );
        return {
          status: 'FAILED',
          error: `HTTP ${response.status}: ${bodyText}`.slice(0, 500),
        };
      }

      const providerMessageId = await this.extractMessageId(response);
      return { status: 'SENT', providerMessageId };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`payom.tj send failed for ${to}: ${message}`);
      return { status: 'FAILED', error: message.slice(0, 500) };
    }
  }

  private async safeReadText(response: Response): Promise<string> {
    try {
      return (await response.text()).slice(0, 300);
    } catch {
      return '';
    }
  }

  private async extractMessageId(
    response: Response,
  ): Promise<string | undefined> {
    try {
      const data: unknown = await response.clone().json();
      if (data && typeof data === 'object') {
        const rec = data as Record<string, unknown>;
        const id = rec.messageId ?? rec.id ?? rec.message_id;
        if (typeof id === 'string' || typeof id === 'number') {
          return String(id);
        }
      }
    } catch {
      // Non-JSON success body — that's fine, no id to extract.
    }
    return undefined;
  }
}
