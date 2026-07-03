import { forwardRef, Module } from '@nestjs/common';
import { AbsenceCheckService } from './absence-check.service';
import { NotificationsModule } from '../notifications/notifications.module';

/**
 * Scheduled automations. Currently: the 3-consecutive-absences parent alert.
 *
 * The daily @Cron in {@link AbsenceCheckService} relies on
 * ScheduleModule.forRoot() being registered globally (wired in app.module by the
 * Build phase). We import NotificationsModule for delivery; forwardRef breaks the
 * cycle with the notifications module, whose controller triggers a manual scan.
 */
@Module({
  imports: [forwardRef(() => NotificationsModule)],
  providers: [AbsenceCheckService],
  exports: [AbsenceCheckService],
})
export class AutomationModule {}
