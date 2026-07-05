import type { User } from '@/shared/types';

export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Backend response for POST /auth/login, /auth/register and /auth/refresh —
 * a short-lived access token plus the user profile. The refresh token is set
 * as an httpOnly cookie by the backend and is NOT part of the JSON body.
 */
export interface AuthResponse {
  accessToken: string;
  user: User;
}

/** Kept as an alias for callers that referenced the login shape by name. */
export type LoginResponse = AuthResponse;

export type { User };
