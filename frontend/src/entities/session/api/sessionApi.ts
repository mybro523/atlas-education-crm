import { axiosClient } from '@/shared/api';
import type { User } from '@/shared/types';
import type { AuthResponse, LoginCredentials, LoginResponse } from '../model/types';

/** POST /auth/login — exchange credentials for an access token + user. */
export async function login(
  credentials: LoginCredentials,
): Promise<LoginResponse> {
  const { data } = await axiosClient.post<LoginResponse>(
    '/auth/login',
    credentials,
  );
  return data;
}

/**
 * POST /auth/refresh — mint a fresh access token from the httpOnly refresh
 * cookie. No body/token is sent; the cookie travels via withCredentials.
 * Returns the new access token plus the current user (used by the bootstrap).
 */
export async function refresh(): Promise<AuthResponse> {
  const { data } = await axiosClient.post<AuthResponse>('/auth/refresh', {});
  return data;
}

/** GET /auth/me — current authenticated user. */
export async function me(): Promise<User> {
  const { data } = await axiosClient.get<User>('/auth/me');
  return data;
}

/** POST /auth/logout — clears the refresh cookie server-side. Best-effort. */
export async function logout(): Promise<void> {
  await axiosClient.post('/auth/logout').catch(() => {
    // Ignore network/401 errors: local logout must always succeed.
  });
}
