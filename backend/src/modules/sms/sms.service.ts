import { Inject, Injectable, Logger } from '@nestjs/common';
import { SMS_PROVIDER, SmsProvider, SmsSendResult } from './sms.types';

/**
 * Thin facade over the active {@link SmsProvider}. Callers (NotificationsService,
 * BroadcastsService, the absence cron) depend on this instead of a concrete
 * gateway, so the provider can be swapped without touching business logic.
 *
 * Never throws: a provider failure surfaces as a `FAILED`/`SKIPPED` result.
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(
    @Inject(SMS_PROVIDER) private readonly provider: SmsProvider,
  ) {}

  async send(phone: string, text: string): Promise<SmsSendResult> {
    try {
      return await this.provider.send(phone, text);
    } catch (err) {
      // Defensive: a compliant provider never throws, but guard anyway so one
      // bad recipient can't abort a whole broadcast loop.
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `SMS provider "${this.provider.name}" threw for ${phone}: ${message}`,
      );
      return { status: 'FAILED', error: message.slice(0, 500) };
    }
  }
}
