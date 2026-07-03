import { Module } from '@nestjs/common';
import { SmsService } from './sms.service';
import { PayomTjProvider } from './payom-tj.provider';
import { SMS_PROVIDER } from './sms.types';

/**
 * SMS abstraction. Binds the {@link SMS_PROVIDER} token to the payom.tj
 * implementation and exposes {@link SmsService} to the rest of the app
 * (notifications, broadcasts, automation).
 */
@Module({
  providers: [
    PayomTjProvider,
    { provide: SMS_PROVIDER, useExisting: PayomTjProvider },
    SmsService,
  ],
  exports: [SmsService],
})
export class SmsModule {}
