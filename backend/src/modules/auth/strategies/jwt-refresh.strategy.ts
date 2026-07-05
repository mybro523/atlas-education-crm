import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { Request } from 'express';
import { JwtPayload } from './jwt.strategy';
import { REFRESH_COOKIE_NAME } from '../cookies';

/** Pull the refresh JWT out of the httpOnly `atlas_rt` cookie. */
function refreshTokenFromCookie(req: Request): string | null {
  const token = (req.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE_NAME];
  return token ?? null;
}

/**
 * Validates the refresh JWT signature/expiry and forwards the raw token so the
 * AuthService can compare it against the hashed token stored in the DB. The token
 * is read exclusively from the httpOnly refresh cookie (never body/bearer).
 */
@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: refreshTokenFromCookie,
      ignoreExpiration: false,
      secretOrKey: config.get<string>('jwt.refreshSecret'),
      passReqToCallback: true,
    });
  }

  validate(req: Request, payload: JwtPayload) {
    const refreshToken = refreshTokenFromCookie(req) ?? '';
    return { ...payload, refreshToken };
  }
}
