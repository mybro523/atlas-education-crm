import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TELEGRAM_SENDER } from '../notifications/telegram-sender.interface';
import { TelegramController } from './telegram.controller';
import { TelegramService } from './telegram.service';
import { TelegramProvider } from './telegram.provider';
import { TelegramBotService } from './telegram-bot.service';
import { TelegramLinkService } from './telegram-link.service';

/**
 * Telegram integration module.
 *
 * - {@link TelegramProvider} owns the Telegraf instance + resilient sendMessage.
 * - {@link TelegramBotService} registers /start /grades /schedule /performance
 *   /help handlers and drives long polling (launched in onModuleInit).
 * - {@link TelegramLinkService} issues JWT-signed link codes and manages the
 *   User.telegramChatId binding (no schema change).
 * - {@link TelegramService} is the public sender facade, also bound to the
 *   TELEGRAM_SENDER token so NotificationsService can deliver over Telegram.
 *
 * PrismaService is global (PrismaModule). JwtModule is registered locally so
 * link codes can be signed/verified without depending on the auth module; the
 * actual secret is passed per-call from ConfigService (jwt.accessSecret).
 *
 * Every integration point is guarded: an empty TELEGRAM_BOT_TOKEN or a network
 * failure never throws during module init or app bootstrap.
 */
@Module({
  imports: [JwtModule.register({})],
  controllers: [TelegramController],
  providers: [
    TelegramProvider,
    TelegramLinkService,
    TelegramBotService,
    TelegramService,
    // Bind the notifications' TELEGRAM_SENDER token to our sender facade so
    // NotificationsService (which injects it with @Optional) delivers over
    // Telegram when this module is wired.
    { provide: TELEGRAM_SENDER, useExisting: TelegramService },
  ],
  exports: [TelegramService, TELEGRAM_SENDER],
})
export class TelegramModule {}
