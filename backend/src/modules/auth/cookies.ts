import { CookieOptions, Response } from 'express';

/** Name of the httpOnly cookie that carries the refresh token. */
export const REFRESH_COOKIE_NAME = 'atlas_rt';

const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Cookie options for the refresh token. In production the SPA lives on a
 * DIFFERENT origin (Vercel) than the API (Railway), so the cookie is cross-site
 * and must be Secure + SameSite=None to be sent at all. We detect production by
 * an https CORS origin (or NODE_ENV) rather than relying on NODE_ENV alone,
 * since the host may not set it. In local dev (http://localhost) we relax to Lax.
 */
function refreshCookieOptions(): CookieOptions {
  const corsOrigin = process.env.CORS_ORIGIN ?? '';
  const crossSiteHttps =
    process.env.NODE_ENV === 'production' || corsOrigin.startsWith('https://');
  return {
    httpOnly: true,
    secure: crossSiteHttps,
    sameSite: crossSiteHttps ? 'none' : 'lax',
    path: '/',
    maxAge: REFRESH_COOKIE_MAX_AGE,
  };
}

/** Store the refresh token in the httpOnly cookie. */
export function setRefreshCookie(res: Response, refreshToken: string): void {
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions());
}

/** Remove the refresh cookie (logout). Must mirror the set options except maxAge. */
export function clearRefreshCookie(res: Response): void {
  const { maxAge: _maxAge, ...options } = refreshCookieOptions();
  res.clearCookie(REFRESH_COOKIE_NAME, options);
}
