import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule as NestScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
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
import { SubjectsModule } from './modules/subjects/subjects.module';
import { CourseTypesModule } from './modules/course-types/course-types.module';
import { StudentsModule } from './modules/students/students.module';
import { TeachersModule } from './modules/teachers/teachers.module';
import { CoursesModule } from './modules/courses/courses.module';
import { GroupsModule } from './modules/groups/groups.module';
import { ScheduleModule } from './modules/schedule/schedule.module';
import { JournalModule } from './modules/journal/journal.module';
import { FinanceModule } from './modules/finance/finance.module';
import { ChatsModule } from './modules/chats/chats.module';
import { BroadcastsModule } from './modules/broadcasts/broadcasts.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { TelegramModule } from './modules/telegram/telegram.module';
import { SmsModule } from './modules/sms/sms.module';
import { AutomationModule } from './modules/automation/automation.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 120,
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
    PrismaModule,
    AuthModule,
    UsersModule,
    HealthModule,
    BranchesModule,
    SubjectsModule,
    CourseTypesModule,
    StudentsModule,
    TeachersModule,
    CoursesModule,
    GroupsModule,
    ScheduleModule,
    JournalModule,
    FinanceModule,
    ChatsModule,
    BroadcastsModule,
    NotificationsModule,
    TelegramModule,
    SmsModule,
    AutomationModule,
  ],
  providers: [
    // Global JWT auth (routes opt out with @Public()).
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // Global rate limiting.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
