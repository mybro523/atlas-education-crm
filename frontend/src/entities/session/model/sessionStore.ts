import { create } from 'zustand';
import { registerTokenBridge } from '@/shared/api';
import type { User } from '@/shared/types';

/**
 * Session state lives in memory ONLY. The access token is never written to
 * localStorage/sessionStorage; on a full page reload it is restored by the
 * auth-bootstrap, which calls POST /auth/refresh using the httpOnly refresh
 * cookie. This keeps tokens out of any JS-persistent storage (XSS-exfiltration
 * surface) while still surviving reloads.
 */
interface SessionState {
  accessToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
  /**
   * False until the initial refresh attempt has settled. Route guards must wait
   * for this before redirecting, otherwise a hard refresh would bounce a
   * logged-in user to /login before the cookie-based restore completes.
   */
  authReady: boolean;
  setSession: (payload: { accessToken: string; user: User }) => void;
  setAccessToken: (accessToken: string) => void;
  setUser: (user: User) => void;
  setAuthReady: (ready: boolean) => void;
  clear: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  accessToken: null,
  user: null,
  isAuthenticated: false,
  authReady: false,

  setSession: ({ accessToken, user }) =>
    set({ accessToken, user, isAuthenticated: true }),

  setAccessToken: (accessToken) =>
    set({ accessToken, isAuthenticated: true }),

  setUser: (user) => set({ user }),

  setAuthReady: (authReady) => set({ authReady }),

  // Clearing keeps authReady untouched: once the bootstrap has run we still
  // know the session is settled, we just have no user anymore.
  clear: () =>
    set({ accessToken: null, user: null, isAuthenticated: false }),
}));

// --- Bridge the store to the axios interceptors (no circular import). ---
registerTokenBridge({
  getAccessToken: () => useSessionStore.getState().accessToken,
  setAccessToken: (token) => useSessionStore.getState().setAccessToken(token),
  onAuthCleared: () => useSessionStore.getState().clear(),
});

/** Convenience selectors. */
export const selectUser = (s: SessionState) => s.user;
export const selectRole = (s: SessionState) => s.user?.role;
export const selectIsAuthenticated = (s: SessionState) => s.isAuthenticated;
export const selectAuthReady = (s: SessionState) => s.authReady;
