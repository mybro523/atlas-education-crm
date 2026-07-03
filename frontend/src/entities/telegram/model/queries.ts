import { useQuery, useQueryClient } from '@tanstack/react-query';

import { useOptimisticMutation } from '@/shared/lib/query';
import { telegramApi } from '../api';
import type { TelegramLinkInit, TelegramLinkStatus } from './types';

export const telegramKeys = {
  all: ['telegram'] as const,
  status: () => ['telegram', 'status'] as const,
};

/** Current Telegram link status for the signed-in user. */
export function useTelegramStatus() {
  return useQuery({
    queryKey: telegramKeys.status(),
    queryFn: () => telegramApi.status(),
  });
}

/**
 * Generate a one-time linking code + bot deep link. Not optimistic (the code is
 * produced by the server); the caller renders the returned `data`.
 */
export function useInitTelegramLink() {
  return useOptimisticMutation<TelegramLinkInit, void>({
    mutationFn: () => telegramApi.init(),
  });
}

/**
 * Unlink the Telegram account. Optimistically flips the cached status to
 * `linked: false` so the UI updates instantly, then reconciles with the server.
 */
export function useUnlinkTelegram() {
  const queryClient = useQueryClient();
  return useOptimisticMutation<TelegramLinkStatus, void>({
    mutationFn: () => telegramApi.unlink(),
    keysToCancel: [telegramKeys.status()],
    keysToInvalidate: [telegramKeys.status()],
    optimisticUpdate: (_vars, qc) => {
      qc.setQueryData<TelegramLinkStatus>(telegramKeys.status(), {
        linked: false,
      });
    },
    options: {
      // Trust the server response immediately (in addition to the settle-time
      // invalidate) so the status reflects the confirmed unlink without a flash.
      onSuccess: (data) => {
        queryClient.setQueryData<TelegramLinkStatus>(
          telegramKeys.status(),
          data,
        );
      },
    },
  });
}
