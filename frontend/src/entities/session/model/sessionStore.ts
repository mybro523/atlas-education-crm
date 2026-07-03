import { create } from 'zustand';
import { STORAGE_KEYS } from '@/shared/config';
import { registerTokenBridge } from '@/shared/api';
import type { AuthTokens, User } from '@/shared/types';

interface PersistedAuth {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
}

interface SessionState extends PersistedAuth {
  /** True once we've read localStorage — guards initial route flicker. */
  hydrated: boolean;
  isAuthenticated: boolean;
  setSession: (payload: { tokens: AuthTokens; user: User }) => void;
  setTokens: (tokens: AuthTokens) => void;
  setUser: (user: User) => void;
  clear: () => void;
}

const EMPTY: PersistedAuth = {
  accessToken: null,
  refreshToken: null,
  user: null,
};

function readPersisted(): PersistedAuth {
  if (typeof window === 'undefined') return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.auth);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<PersistedAuth>;
    return {
      accessToken: parsed.accessToken ?? null,
      refreshToken: parsed.refreshToken ?? null,
      user: parsed.user ?? null,
    };
  } catch {
    return EMPTY;
  }
}

function persist(state: PersistedAuth): void {
  if (typeof window === 'undefined') return;
  if (!state.accessToken && !state.refreshToken) {
    window.localStorage.removeItem(STORAGE_KEYS.auth);
    return;
  }
  window.localStorage.setItem(STORAGE_KEYS.auth, JSON.stringify(state));
}

const initial = readPersisted();

export const useSessionStore = create<SessionState>((set, get) => ({
  ...initial,
  hydrated: true,
  isAuthenticated: !!initial.accessToken,

  setSession: ({ tokens, user }) => {
    const next: PersistedAuth = {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user,
    };
    persist(next);
    set({ ...next, isAuthenticated: true });
  },

  setTokens: (tokens) => {
    const next: PersistedAuth = {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: get().user,
    };
    persist(next);
    set({
      accessToken: next.accessToken,
      refreshToken: next.refreshToken,
      isAuthenticated: true,
    });
  },

  setUser: (user) => {
    set({ user });
    persist({
      accessToken: get().accessToken,
      refreshToken: get().refreshToken,
      user,
    });
  },

  clear: () => {
    persist(EMPTY);
    set({ ...EMPTY, isAuthenticated: false });
  },
}));

// --- Bridge the store to the axios interceptors (no circular import). ---
registerTokenBridge({
  getAccessToken: () => useSessionStore.getState().accessToken,
  getRefreshToken: () => useSessionStore.getState().refreshToken,
  setTokens: (tokens) => useSessionStore.getState().setTokens(tokens),
  onAuthCleared: () => useSessionStore.getState().clear(),
});

/** Convenience selectors. */
export const selectUser = (s: SessionState) => s.user;
export const selectRole = (s: SessionState) => s.user?.role;
export const selectIsAuthenticated = (s: SessionState) => s.isAuthenticated;
