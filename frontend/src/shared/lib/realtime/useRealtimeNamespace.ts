import { useEffect, useRef, useState } from 'react';

import { API_URL } from '@/shared/config';
import { getTokenBridge } from '@/shared/api';
import { RealtimeSocket, type RealtimeStatus } from './RealtimeSocket';

/**
 * Process-wide cache of one `RealtimeSocket` per namespace so multiple mounted
 * components (or a remount during navigation) share a single websocket rather
 * than opening a new one each time.
 */
const sockets = new Map<string, RealtimeSocket>();
/** Ref-count of live subscribers per namespace, to know when to disconnect. */
const refCounts = new Map<string, number>();

function getSocket(namespace: string): RealtimeSocket {
  let socket = sockets.get(namespace);
  if (!socket) {
    socket = new RealtimeSocket({
      apiBaseUrl: API_URL,
      namespace,
      getToken: () => getTokenBridge()?.getAccessToken() ?? null,
    });
    sockets.set(namespace, socket);
  }
  return socket;
}

/** Event -> handler map passed to {@link useRealtimeNamespace}. */
export type RealtimeHandlers = Record<string, (...args: unknown[]) => void>;

/**
 * Subscribe a component to a Socket.IO namespace.
 *
 * Connects (shared, ref-counted) on mount, binds `handlers` to their events,
 * and cleans up on unmount. Handlers are kept in a ref so callers can pass fresh
 * closures each render without re-subscribing. Returns the live connection
 * status for optional UI (e.g. a "reconnecting" hint).
 */
export function useRealtimeNamespace(
  namespace: string,
  handlers: RealtimeHandlers,
  enabled = true,
): RealtimeStatus {
  const [status, setStatus] = useState<RealtimeStatus>('idle');
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!enabled) return;

    const socket = getSocket(namespace);
    refCounts.set(namespace, (refCounts.get(namespace) ?? 0) + 1);

    // Bind a stable trampoline per event that reads the latest handler ref.
    const events = Object.keys(handlersRef.current);
    const unbinders = events.map((event) =>
      socket.on(event, (...args) => handlersRef.current[event]?.(...args)),
    );
    const unbindStatus = socket.onStatus(setStatus);

    socket.connect();

    return () => {
      unbinders.forEach((off) => off());
      unbindStatus();
      const next = (refCounts.get(namespace) ?? 1) - 1;
      refCounts.set(namespace, next);
      if (next <= 0) {
        refCounts.delete(namespace);
        socket.disconnect();
        sockets.delete(namespace);
      }
    };
    // Re-subscribe only when the namespace or enabled flag changes; handlers are
    // read from a ref so the set of event *names* is assumed stable per call
    // site (no need to list `handlers` as a dependency).
  }, [namespace, enabled]);

  return status;
}
