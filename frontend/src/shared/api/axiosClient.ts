import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';

import { API_URL } from '@/shared/config';
import type { AuthTokens } from '@/shared/types';
import { getTokenBridge } from './tokenStore';

/** Requests we retried after a refresh get flagged to avoid infinite loops. */
interface RetriableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

export const axiosClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  // Refresh cookie support if the backend ever moves refresh to httpOnly cookie.
  withCredentials: false,
});

// --- Request interceptor: attach the access token. ---
axiosClient.interceptors.request.use((config) => {
  const token = getTokenBridge()?.getAccessToken();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

// --- Response interceptor: transparent 401 -> refresh -> retry. ---

/** Single in-flight refresh shared by all queued 401s. */
let refreshPromise: Promise<AuthTokens> | null = null;

async function performRefresh(refreshToken: string): Promise<AuthTokens> {
  // Bare axios (not axiosClient) so we don't re-enter these interceptors.
  const { data } = await axios.post<AuthTokens>(
    `${API_URL}/auth/refresh`,
    { refreshToken },
    { headers: { 'Content-Type': 'application/json' } },
  );
  return data;
}

axiosClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const bridge = getTokenBridge();
    const original = error.config as RetriableConfig | undefined;

    const isUnauthorized = error.response?.status === 401;
    const refreshToken = bridge?.getRefreshToken();

    // Don't try to refresh the refresh call itself, or when we have no config,
    // already retried, or have no refresh token. Explicit guards (rather than a
    // combined boolean) so TypeScript narrows `original`/`refreshToken`.
    if (
      !isUnauthorized ||
      !original ||
      original._retry ||
      !refreshToken ||
      original.url?.includes('/auth/refresh')
    ) {
      return Promise.reject(error);
    }

    original._retry = true;

    try {
      if (!refreshPromise) {
        refreshPromise = performRefresh(refreshToken).finally(() => {
          refreshPromise = null;
        });
      }
      const tokens = await refreshPromise;
      bridge?.setTokens(tokens);

      original.headers.set('Authorization', `Bearer ${tokens.accessToken}`);
      return axiosClient(original as AxiosRequestConfig);
    } catch (refreshError) {
      bridge?.onAuthCleared();
      return Promise.reject(refreshError);
    }
  },
);

/** Extract a human-readable message from an axios error. */
export function extractErrorMessage(error: unknown): string | undefined {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string | string[] } | undefined;
    const message = data?.message;
    if (Array.isArray(message)) return message[0];
    if (typeof message === 'string') return message;
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return undefined;
}
