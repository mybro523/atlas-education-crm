import { Module } from '@nestjs/common';

import { PaymentsController } from './payments/payments.controller';
import { PaymentsService } from './payments/payments.service';

import { FinanceRecordsController } from './records/finance-records.controller';
import { FinanceRecordsService } from './records/finance-records.service';

import { SalariesController } from './salaries/salaries.controller';
import { SalariesService } from './salaries/salaries.service';

import { LessonRatesController } from './lesson-rates/lesson-rates.controller';
import { LessonRatesService } from './lesson-rates/lesson-rates.service';

import { AnalyticsController } from './analytics/analytics.controller';
import { AnalyticsService } from './analytics/analytics.service';

/**
 * Finance module — FOUNDER-only across the board (each controller guards itself
 * with RolesGuard + @Roles(Role.FOUNDER)). PrismaService is provided globally.
 *
 * Route map:
 *   /api/payments*                     (PaymentsController)
 *   /api/finance/records*              (FinanceRecordsController)
 *   /api/finance/salaries*             (SalariesController)
 *   /api/finance/lesson-rates*         (LessonRatesController)
 *   /api/finance/analytics/{summary,series} (AnalyticsController)
 */
@Module({
  controllers: [
    PaymentsController,
    FinanceRecordsController,
    SalariesController,
    LessonRatesController,
    AnalyticsController,
  ],
  providers: [
    PaymentsService,
    FinanceRecordsService,
    SalariesService,
    LessonRatesService,
    AnalyticsService,
  ],
  exports: [
    PaymentsService,
    FinanceRecordsService,
    SalariesService,
    LessonRatesService,
    AnalyticsService,
  ],
})
export class FinanceModule {}
