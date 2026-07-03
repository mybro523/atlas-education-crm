import { axiosClient } from '@/shared/api';
import type { AuthTokens, User } from '@/shared/types';
import type { LoginCredentials, LoginResponse } from '../model/types';

/** POST /auth/login — exchange credentials for tokens + user. */
export async function login(
  credentials: LoginCredentials,
): Promise<LoginResponse> {
  const { data } = await axiosClient.post<LoginResponse>(
    '/auth/login',
    credentials,
  );
  return data;
}

/** POST /auth/refresh — rotate the token pair. */
export async function refresh(refreshToken: string): Promise<AuthTokens> {
  const { data } = await axiosClient.post<AuthTokens>('/auth/refresh', {
    refreshToken,
  });
  return data;
}

/** GET /auth/me — current authenticated user. */
export async function me(): Promise<User> {
  const { data } = await axiosClient.get<User>('/auth/me');
  return data;
}

/** POST /auth/logout — best-effort server-side refresh-token revocation. */
export async function logout(): Promise<void> {
  await axiosClient.post('/auth/logout').catch(() => {
    // Ignore network/401 errors: local logout must always succeed.
  });
}
