/**
 * Decouples the axios client from the Zustand session store to avoid a
 * circular import (axiosClient <- session store <- axiosClient).
 *
 * The session store registers accessors on startup; the axios interceptors
 * read/update the in-memory access token and trigger logout through these
 * hooks. No refresh token is exposed here — it lives in an httpOnly cookie
 * managed by the backend and is never readable from JS.
 */
export interface TokenBridge {
  /** Current in-memory access token (null when unauthenticated). */
  getAccessToken: () => string | null;
  /** Replace the in-memory access token after a transparent refresh. */
  setAccessToken: (token: string) => void;
  /** Clear the session (called when a refresh definitively fails). */
  onAuthCleared: () => void;
}

let bridge: TokenBridge | null = null;

export function registerTokenBridge(next: TokenBridge): void {
  bridge = next;
}

export function getTokenBridge(): TokenBridge | null {
  return bridge;
}
