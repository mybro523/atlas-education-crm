import { Module } from '@nestjs/common';

import { SettingsModule } from '../settings/settings.module';
import { StudentPaymentsController } from './student-payments.controller';
import { StudentPaymentsService } from './student-payments.service';

/**
 * Payments module — student subscription payments (ad-hoc, always PAID).
 * FOUNDER + ADMIN (guarded at the controller). PrismaService is global.
 *
 * Route map:
 *   /api/student-payments   (StudentPaymentsController)
 *
 * Distinct from the FOUNDER-only monthly billing under the finance module.
 */
@Module({
  imports: [SettingsModule],
  controllers: [StudentPaymentsController],
  providers: [StudentPaymentsService],
  exports: [StudentPaymentsService],
})
export class PaymentsModule {}
