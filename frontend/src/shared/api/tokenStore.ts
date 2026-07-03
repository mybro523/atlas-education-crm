import type { AuthTokens } from '@/shared/types';

/**
 * Decouples the axios client from the Zustand session store to avoid a
 * circular import (axiosClient <- session store <- axiosClient).
 *
 * The session store registers accessors on startup; the axios interceptors
 * read/update tokens and trigger logout through these hooks.
 */
export interface TokenBridge {
  getAccessToken: () => string | null;
  getRefreshToken: () => string | null;
  setTokens: (tokens: AuthTokens) => void;
  onAuthCleared: () => void;
}

let bridge: TokenBridge | null = null;

export function registerTokenBridge(next: TokenBridge): void {
  bridge = next;
}

export function getTokenBridge(): TokenBridge | null {
  return bridge;
}
