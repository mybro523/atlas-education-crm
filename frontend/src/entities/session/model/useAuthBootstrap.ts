import { useEffect, useRef } from 'react';

import { refresh } from '../api/sessionApi';
import { useSessionStore } from './sessionStore';

/**
 * Restore the in-memory session on app start. Because the access token is not
 * persisted to any JS-readable storage, a full page reload begins
 * unauthenticated; this attempts POST /auth/refresh against the httpOnly
 * refresh cookie to re-establish the session, then flips `authReady` so the
 * route guards can render. Runs exactly once per mount.
 */
export function useAuthBootstrap(): void {
  const setSession = useSessionStore((s) => s.setSession);
  const setAuthReady = useSessionStore((s) => s.setAuthReady);
  const clear = useSessionStore((s) => s.clear);
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    void (async () => {
      try {
        const { accessToken, user } = await refresh();
        setSession({ accessToken, user });
      } catch {
        // No valid cookie / refresh rejected -> stay logged out.
        clear();
      } finally {
        setAuthReady(true);
      }
    })();
  }, [setSession, setAuthReady, clear]);
}
