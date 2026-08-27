import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { REFRESH_COOKIE_NAME, clearRefreshCookie, setRefreshCookie } from './cookies';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // NOTE: public self-registration was removed with the SaaS conversion —
  // every account now belongs to a client academy, and accounts are created
  // by the platform owner (academies+founders) or by academy staff.

  // Strict per-IP limit on credential endpoints: 5 attempts/minute defeats
  // password brute-forcing while the global 120/min guard covers everything else.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, refreshToken, user } = await this.authService.login(dto);
    setRefreshCookie(res, refreshToken);
    return { accessToken, user };
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt-refresh'))
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @CurrentUser() user: { sub: string; refreshToken: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const presented = (req.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE_NAME];
    if (!presented) {
      throw new UnauthorizedException('Refresh token is missing');
    }

    const { accessToken, refreshToken } = await this.authService.refresh(
      user.sub,
      user.refreshToken,
    );
    setRefreshCookie(res, refreshToken);
    const safeUser = await this.authService.me(user.sub);
    return { accessToken, user: safeUser };
  }

  @Get('me')
  me(@CurrentUser('id') userId: string) {
    return this.authService.me(userId);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout')
  async logout(
    @CurrentUser('id') userId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    clearRefreshCookie(res);
    await this.authService.logout(userId);
  }
}
