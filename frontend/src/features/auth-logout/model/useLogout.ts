import { useQueryClient } from '@tanstack/react-query';
import { logout as logoutRequest, useSessionStore } from '@/entities/session';

/**
 * Logout: best-effort server revocation, then clear local session + caches.
 * Local clear always runs even if the network call fails.
 */
export function useLogout(): { logout: () => Promise<void> } {
  const clear = useSessionStore((s) => s.clear);
  const queryClient = useQueryClient();

  const logout = async () => {
    await logoutRequest();
    clear();
    queryClient.clear();
  };

  return { logout };
}
