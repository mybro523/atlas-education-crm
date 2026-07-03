import { axiosClient } from '@/shared/api';
import type { TelegramLinkInit, TelegramLinkStatus } from './model/types';

/**
 * Telegram account-linking endpoints (INTEGRATION API — TELEGRAM LINK).
 * All require an authenticated user; no role restriction.
 */
export const telegramApi = {
  /** Read the current link status for the signed-in user. */
  async status(): Promise<TelegramLinkStatus> {
    const { data } = await axiosClient.get<TelegramLinkStatus>(
      '/telegram/link/status',
    );
    return data;
  },

  /** Generate a fresh one-time linking code + bot deep link. */
  async init(): Promise<TelegramLinkInit> {
    const { data } = await axiosClient.post<TelegramLinkInit>(
      '/telegram/link/init',
    );
    return data;
  },

  /** Disconnect the linked Telegram account. */
  async unlink(): Promise<TelegramLinkStatus> {
    const { data } = await axiosClient.post<TelegramLinkStatus>(
      '/telegram/unlink',
    );
    return data;
  },
};
