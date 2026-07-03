import { io, type Socket } from 'socket.io-client';

/** A namespaced-event listener. */
type Listener = (...args: unknown[]) => void;

/** Lifecycle status, mirroring socket.io-client's connection states. */
export type RealtimeStatus = 'idle' | 'connecting' | 'connected' | 'closed';

export interface RealtimeSocketOptions {
  /** REST API base (e.g. http://localhost:3000/api); origin is derived from it. */
  apiBaseUrl: string;
  /** Socket.IO namespace to CONNECT to (e.g. "/chats"). */
  namespace: string;
  /** Called to get a fresh access token on every (re)connect. */
  getToken?: () => string | null;
  /** Base delay for exponential reconnect backoff (ms). */
  reconnectBaseDelay?: number;
  /** Max reconnect backoff (ms). */
  reconnectMaxDelay?: number;
}

/**
 * Thin wrapper around `socket.io-client` for one namespace.
 *
 * This talks to the backend `@nestjs/platform-socket.io` gateway (Engine.IO v4)
 * mounted at the site origin on the '/chats' namespace with the default
 * '/socket.io/' path. Heartbeats (PING/PONG) are handled by socket.io itself —
 * we do NOT send any manual Engine.IO frames (the previous native-WebSocket
 * client sent a client PING that the server rejected, closing the socket every
 * ~25s). Reconnection with backoff is delegated to the client too.
 *
 * The public surface (`on`/`off`/`emit`/`connect`/`disconnect`/`onStatus`/
 * `connected`) is unchanged so `useRealtimeNamespace` and the chats page keep
 * working without modification.
 */
export class RealtimeSocket {
  private socket: Socket | null = null;

  private readonly listeners = new Map<string, Set<Listener>>();
  private readonly statusListeners = new Set<(s: RealtimeStatus) => void>();
  private status: RealtimeStatus = 'idle';

  private readonly namespace: string;
  private readonly apiBaseUrl: string;
  private readonly getToken?: () => string | null;
  private readonly reconnectBaseDelay: number;
  private readonly reconnectMaxDelay: number;

  constructor(options: RealtimeSocketOptions) {
    this.namespace = options.namespace;
    this.apiBaseUrl = options.apiBaseUrl;
    this.getToken = options.getToken;
    this.reconnectBaseDelay = options.reconnectBaseDelay ?? 1000;
    this.reconnectMaxDelay = options.reconnectMaxDelay ?? 15000;
  }

  /** Open the connection (idempotent while already open/connecting). */
  connect(): void {
    if (typeof window === 'undefined') return;
    if (this.socket) {
      // Already have a client — make sure it's (re)connecting and refresh auth.
      if (!this.socket.connected) {
        this.applyAuth();
        this.socket.connect();
      }
      return;
    }

    this.setStatus('connecting');
    const socket = io(this.buildUrl(), {
      path: '/socket.io/',
      transports: ['websocket'],
      withCredentials: true,
      autoConnect: false,
      reconnection: true,
      reconnectionDelay: this.reconnectBaseDelay,
      reconnectionDelayMax: this.reconnectMaxDelay,
      auth: (cb) => cb(this.authPayload()),
    });
    this.socket = socket;

    socket.on('connect', () => this.setStatus('connected'));
    socket.on('disconnect', () => this.setStatus('connecting'));
    socket.on('connect_error', () => this.setStatus('connecting'));
    socket.io.on('reconnect_attempt', () => this.setStatus('connecting'));

    // Re-dispatch every server event to the local listener registry. socket.io
    // has no wildcard by default, so bind the known handled events plus use
    // onAny for anything callers subscribed to.
    socket.onAny((event: string, ...args: unknown[]) =>
      this.dispatch(event, args),
    );

    socket.connect();
  }

  /** Permanently close the connection and stop reconnecting. */
  disconnect(): void {
    if (this.socket) {
      try {
        this.socket.removeAllListeners();
        this.socket.disconnect();
      } catch {
        /* ignore */
      }
      this.socket = null;
    }
    this.setStatus('closed');
  }

  /** Subscribe to a namespaced server event. Returns an unsubscribe fn. */
  on(event: string, listener: Listener): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(listener);
    return () => this.off(event, listener);
  }

  /** Remove a previously added listener (or all listeners for `event`). */
  off(event: string, listener?: Listener): void {
    if (!listener) {
      this.listeners.delete(event);
      return;
    }
    this.listeners.get(event)?.delete(listener);
  }

  /** Emit a client EVENT to the server on this namespace (best-effort). */
  emit(event: string, ...args: unknown[]): void {
    if (this.socket?.connected) {
      this.socket.emit(event, ...args);
    }
  }

  /** Subscribe to connection-status changes. Returns an unsubscribe fn. */
  onStatus(listener: (s: RealtimeStatus) => void): () => void {
    this.statusListeners.add(listener);
    listener(this.status);
    return () => this.statusListeners.delete(listener);
  }

  get connected(): boolean {
    return this.status === 'connected';
  }

  // --- internals -----------------------------------------------------------

  /**
   * Build the socket.io connection URL: the server ORIGIN + namespace. The
   * origin is derived from the REST base by stripping a trailing '/api'
   * (e.g. http://localhost:3000/api -> http://localhost:3000). socket.io reads
   * the namespace ('/chats') from the URL path segment after the origin.
   */
  private buildUrl(): string {
    let origin: string;
    try {
      const url = new URL(this.apiBaseUrl, window.location.origin);
      origin = url.origin;
    } catch {
      origin = window.location.origin;
    }
    const ns = this.namespace.startsWith('/')
      ? this.namespace
      : `/${this.namespace}`;
    return `${origin}${ns}`;
  }

  /** Current auth payload for the handshake (token optional). */
  private authPayload(): Record<string, string> {
    const token = this.getToken?.();
    return token ? { token } : {};
  }

  /** Refresh the auth payload on the existing client before a reconnect. */
  private applyAuth(): void {
    if (this.socket) this.socket.auth = this.authPayload();
  }

  private dispatch(event: string, args: unknown[]): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const listener of set) {
      try {
        listener(...args);
      } catch {
        /* a bad listener must not break the socket */
      }
    }
  }

  private setStatus(next: RealtimeStatus): void {
    if (this.status === next) return;
    this.status = next;
    for (const listener of this.statusListeners) {
      try {
        listener(next);
      } catch {
        /* ignore */
      }
    }
  }
}
