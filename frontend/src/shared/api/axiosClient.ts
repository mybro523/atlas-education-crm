import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';

import { API_URL } from '@/shared/config';
import { getTokenBridge } from './tokenStore';

/** Requests we retried after a refresh get flagged to avoid infinite loops. */
interface RetriableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

/** Shape of the /auth/refresh response — a fresh access token (user ignored here). */
interface RefreshResponse {
  accessToken: string;
}

export const axiosClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  // Send/receive the httpOnly refresh cookie on every request (login, refresh,
  // logout and normal calls all rely on it).
  withCredentials: true,
});

// --- Request interceptor: attach the in-memory access token. ---
axiosClient.interceptors.request.use((config) => {
  const token = getTokenBridge()?.getAccessToken();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

// --- Response interceptor: transparent 401 -> refresh -> retry. ---

/** Single in-flight refresh shared by all queued 401s. */
let refreshPromise: Promise<string> | null = null;

/**
 * Ask the backend for a new access token. The refresh token travels in the
 * httpOnly cookie (withCredentials), so there is no body to send. Uses bare
 * axios so we don't re-enter these interceptors.
 */
async function performRefresh(): Promise<string> {
  const { data } = await axios.post<RefreshResponse>(
    `${API_URL}/auth/refresh`,
    {},
    { withCredentials: true, headers: { 'Content-Type': 'application/json' } },
  );
  return data.accessToken;
}

axiosClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const bridge = getTokenBridge();
    const original = error.config as RetriableConfig | undefined;

    const isUnauthorized = error.response?.status === 401;

    // Don't try to refresh the refresh call itself, or when we have no config
    // or already retried. Explicit guards (rather than a combined boolean) so
    // TypeScript narrows `original`.
    if (
      !isUnauthorized ||
      !original ||
      original._retry ||
      original.url?.includes('/auth/refresh')
    ) {
      return Promise.reject(error);
    }

    original._retry = true;

    try {
      if (!refreshPromise) {
        refreshPromise = performRefresh().finally(() => {
          refreshPromise = null;
        });
      }
      const accessToken = await refreshPromise;
      bridge?.setAccessToken(accessToken);

      original.headers.set('Authorization', `Bearer ${accessToken}`);
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
