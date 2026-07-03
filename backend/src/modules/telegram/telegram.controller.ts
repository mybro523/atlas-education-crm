import { Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  LinkInitResult,
  LinkStatusResult,
  TelegramLinkService,
} from './telegram-link.service';

/**
 * Telegram account-linking endpoints. All are authenticated (covered by the
 * global JwtAuthGuard — no @Public here) and operate on the caller's own
 * account resolved from the JWT.
 *
 * Any authenticated role may link their Telegram; the bot then gates which
 * commands return data based on the user's role.
 */
@Controller('telegram')
export class TelegramController {
  constructor(private readonly links: TelegramLinkService) {}

  /** Issue a short-lived link code + t.me deep link for the current user. */
  @Post('link/init')
  @HttpCode(HttpStatus.OK)
  init(@CurrentUser('id') userId: string): Promise<LinkInitResult> {
    return this.links.initLink(userId);
  }

  /** Whether the current user's Telegram is linked (+ chat id if so). */
  @Get('link/status')
  status(@CurrentUser('id') userId: string): Promise<LinkStatusResult> {
    return this.links.status(userId);
  }

  /** Clear the current user's Telegram binding. */
  @Post('unlink')
  @HttpCode(HttpStatus.OK)
  unlink(@CurrentUser('id') userId: string): Promise<LinkStatusResult> {
    return this.links.unlink(userId);
  }
}
