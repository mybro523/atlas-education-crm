import { forwardRef, Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsQueue } from './notifications.queue';
import { SmsModule } from '../sms/sms.module';
import { AutomationModule } from '../automation/automation.module';

/**
 * Notifications pipeline: records + delivers TELEGRAM / SMS notifications.
 *
 * - Imports SmsModule for the SMS delivery path.
 * - forwardRef(AutomationModule): the controller's POST /run-absence-check
 *   triggers AbsenceCheckService, while AutomationModule imports us for delivery
 *   — a cycle broken with forwardRef on both sides.
 * - The optional TELEGRAM_SENDER token is bound by the Telegram module; when
 *   absent, the TELEGRAM channel degrades gracefully (see NotificationsService).
 *
 * Exports NotificationsService so broadcasts + automation can dispatch through
 * the same audited pipeline.
 */
@Module({
  imports: [SmsModule, forwardRef(() => AutomationModule)],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsQueue],
  exports: [NotificationsService],
})
export class NotificationsModule {}
