import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule as NestScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import {
  AcceptLanguageResolver,
  HeaderResolver,
  I18nModule,
  QueryResolver,
} from 'nestjs-i18n';
import { join } from 'path';

import configuration from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { HealthModule } from './modules/health/health.module';
import { BranchesModule } from './modules/branches/branches.module';
import { RoomsModule } from './modules/rooms/rooms.module';
import { CourseTypesModule } from './modules/course-types/course-types.module';
import { StudentsModule } from './modules/students/students.module';
import { TeachersModule } from './modules/teachers/teachers.module';
import { CoursesModule } from './modules/courses/courses.module';
import { GroupsModule } from './modules/groups/groups.module';
import { ScheduleModule } from './modules/schedule/schedule.module';
import { JournalModule } from './modules/journal/journal.module';
import { FinanceModule } from './modules/finance/finance.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ChatsModule } from './modules/chats/chats.module';
import { BroadcastsModule } from './modules/broadcasts/broadcasts.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { TelegramModule } from './modules/telegram/telegram.module';
import { SmsModule } from './modules/sms/sms.module';
import { AutomationModule } from './modules/automation/automation.module';
import { SettingsModule } from './modules/settings/settings.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { OwnerModule } from './modules/owner/owner.module';
import { TenancyModule } from './common/tenancy/tenancy.module';
import { TenancyInterceptor } from './common/tenancy/tenancy.interceptor';
import { SubscriptionGuard } from './common/guards/subscription.guard';
import { UserThrottlerGuard } from './common/guards/user-throttler.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    // Budget is per USER (see UserThrottlerGuard), so one academy's staff
    // behind a shared office IP no longer throttle each other. 300/min covers
    // heavy page loads (a dashboard fires ~10-15 requests) with headroom.
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 300,
      },
    ]),
    // Enables @Cron scheduling (e.g. the daily absence-check automation).
    // Aliased so it does not collide with the domain ScheduleModule (lessons).
    NestScheduleModule.forRoot(),
    I18nModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        fallbackLanguage: config.get<string>('defaultLanguage') ?? 'ru',
        loaderOptions: {
          path: join(__dirname, '/i18n/'),
          watch: true,
        },
      }),
      resolvers: [
        { use: QueryResolver, options: ['lang'] },
        new HeaderResolver(['x-lang']),
        AcceptLanguageResolver,
      ],
      inject: [ConfigService],
    }),
    RealtimeModule,
    PrismaModule,
    AuthModule,
    UsersModule,
    HealthModule,
    BranchesModule,
    RoomsModule,
    CourseTypesModule,
    StudentsModule,
    TeachersModule,
    CoursesModule,
    GroupsModule,
    ScheduleModule,
    JournalModule,
    FinanceModule,
    PaymentsModule,
    ChatsModule,
    BroadcastsModule,
    NotificationsModule,
    TelegramModule,
    SmsModule,
    AutomationModule,
    SettingsModule,
    TenancyModule,
    OwnerModule,
  ],
  providers: [
    // Global JWT auth (routes opt out with @Public()).
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // Global rate limiting.
    { provide: APP_GUARD, useClass: UserThrottlerGuard },
    // SaaS subscription gate (blocked/expired academies get 403). The guard
    // instance lives in the global TenancyModule; useExisting reuses that same
    // singleton so OwnerService cache invalidation reaches the active guard.
    { provide: APP_GUARD, useExisting: SubscriptionGuard },
    // Binds the caller's academy to the async context so the Prisma tenancy
    // middleware scopes every query automatically.
    { provide: APP_INTERCEPTOR, useClass: TenancyInterceptor },
  ],
})
export class AppModule {}
