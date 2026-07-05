import {
  useMutation,
  useQueryClient,
  type QueryKey,
  type UseMutationOptions,
  type UseMutationResult,
} from '@tanstack/react-query';

/**
 * Generic OPTIMISTIC mutation helper (hard product requirement: instant UI, no
 * manual refresh). It wires the full optimistic lifecycle so every CRUD hook in
 * the entities layer stays a one-liner:
 *
 * 1. `onMutate` cancels in-flight queries touching `keysToCancel`, snapshots
 *    their current data, then applies the caller's optimistic cache updates.
 * 2. `onError` rolls every snapshot back.
 * 3. `onSettled` invalidates `keysToInvalidate` so the server truth reconciles.
 *
 * The caller only describes *what* changes via `optimisticUpdate` (which mutates
 * the cache through the passed `queryClient`) and *which* keys to touch.
 */
export interface OptimisticMutationConfig<TData, TVars, TContext = unknown> {
  /** The async mutation (usually an entity api call). */
  mutationFn: (variables: TVars) => Promise<TData>;
  /**
   * Query keys (exact or prefix) to cancel + snapshot + restore. Can be static
   * or derived from the mutation variables.
   */
  keysToCancel?: QueryKey[] | ((variables: TVars) => QueryKey[]);
  /** Query keys (prefixes) to invalidate once the mutation settles. */
  keysToInvalidate?: QueryKey[] | ((variables: TVars) => QueryKey[]);
  /**
   * Apply the optimistic change to the cache. Runs after snapshotting, inside
   * `onMutate`. Mutate the cache via `queryClient.setQueryData(...)`. May return
   * extra context merged into the rollback context.
   */
  optimisticUpdate?: (
    variables: TVars,
    queryClient: ReturnType<typeof useQueryClient>,
  ) => TContext | void;
  /**
   * Reconcile the cache with the REAL server response the moment the mutation
   * succeeds — before the `keysToInvalidate` refetch lands. The critical use is
   * replacing a temporary `optimistic-*` row with the server row (real id) so
   * follow-up actions (edit / delete / pay) never send a fake id to the API,
   * no matter how fast the user clicks. Receives the `optimisticUpdate` return
   * value (e.g. the temp id) as `extra`.
   */
  onServerData?: (
    data: TData,
    variables: TVars,
    queryClient: ReturnType<typeof useQueryClient>,
    extra: TContext | undefined,
  ) => void;
  /** Extra options forwarded to `useMutation` (onSuccess, etc.). */
  options?: Omit<
    UseMutationOptions<TData, unknown, TVars, OptimisticContext>,
    'mutationFn' | 'onMutate' | 'onError' | 'onSettled'
  >;
}

/** Rollback context carried between the optimistic lifecycle callbacks. */
interface OptimisticContext {
  snapshots: Array<[QueryKey, unknown]>;
  extra?: unknown;
}

function resolveKeys<TVars>(
  keys: QueryKey[] | ((variables: TVars) => QueryKey[]) | undefined,
  variables: TVars,
): QueryKey[] {
  if (!keys) return [];
  return typeof keys === 'function' ? keys(variables) : keys;
}

export function useOptimisticMutation<TData, TVars, TContext = unknown>(
  config: OptimisticMutationConfig<TData, TVars, TContext>,
): UseMutationResult<TData, unknown, TVars, OptimisticContext> {
  const queryClient = useQueryClient();

  return useMutation<TData, unknown, TVars, OptimisticContext>({
    ...config.options,
    mutationFn: config.mutationFn,
    onMutate: async (variables) => {
      const cancelKeys = resolveKeys(config.keysToCancel, variables);

      // 1. Cancel outgoing refetches so they can't clobber the optimistic write.
      await Promise.all(
        cancelKeys.map((key) => queryClient.cancelQueries({ queryKey: key })),
      );

      // 2. Snapshot everything under the cancel keys for rollback.
      const snapshots: Array<[QueryKey, unknown]> = [];
      for (const key of cancelKeys) {
        const entries = queryClient.getQueriesData({ queryKey: key });
        for (const [entryKey, data] of entries) {
          snapshots.push([entryKey, data]);
        }
      }

      // 3. Apply the optimistic cache change.
      const extra = config.optimisticUpdate?.(variables, queryClient);

      return { snapshots, extra: extra ?? undefined };
    },
    onSuccess: (...args) => {
      // Reconcile the cache with server truth IMMEDIATELY (e.g. swap the temp
      // `optimistic-*` row for the real one) so rapid follow-up actions always
      // operate on a real id — then forward to any caller-provided onSuccess.
      const [data, variables, context] = args;
      config.onServerData?.(
        data,
        variables,
        queryClient,
        context?.extra as TContext | undefined,
      );
      config.options?.onSuccess?.(...args);
    },
    onError: (_error, _variables, context) => {
      // Roll every snapshot back to its pre-mutation value.
      context?.snapshots.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
    },
    onSettled: (_data, _error, variables) => {
      const invalidateKeys = resolveKeys(config.keysToInvalidate, variables);
      invalidateKeys.forEach((key) => {
        void queryClient.invalidateQueries({ queryKey: key });
      });
    },
  });
}

/* ------------------------------------------------------------------ *
 * Ready-made cache updaters for the three canonical list mutations.
 *
 * They handle both a bare array cache (`T[]`) and the paginated envelope
 * `{ items: T[]; meta }` from `pagination.ts`, so `optimisticUpdate` callbacks
 * in the entities layer stay one-liners, e.g.:
 *
 *   optimisticUpdate: (vars, qc) =>
 *     qc.setQueriesData({ queryKey: studentKeys.lists() },
 *       insertIntoListCache(optimisticStudent)),
 * ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ *
 * Temporary optimistic ids.
 *
 * A row inserted optimistically carries a fake id until the server row
 * replaces it (via `onServerData` + `replaceInListCache`). Actions that hit
 * the API with an id (edit / delete / pay / navigate) MUST NOT fire while a
 * row is still optimistic — gate them with `isOptimisticId`.
 * ------------------------------------------------------------------ */

export const OPTIMISTIC_ID_PREFIX = 'optimistic-';

let optimisticSeq = 0;

/** Unique temp id — a per-session counter avoids same-millisecond collisions. */
export function makeOptimisticId(): string {
  optimisticSeq += 1;
  return `${OPTIMISTIC_ID_PREFIX}${Date.now()}-${optimisticSeq}`;
}

/** True when `id` is a not-yet-persisted optimistic placeholder. */
export function isOptimisticId(id: string | null | undefined): boolean {
  return typeof id === 'string' && id.startsWith(OPTIMISTIC_ID_PREFIX);
}

type ListEnvelope<T> = { items: T[] } & Record<string, unknown>;

function isEnvelope<T>(value: unknown): value is ListEnvelope<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as { items?: unknown }).items)
  );
}

/** Map over an array cache OR a `{ items: T[] }` envelope, leaving meta intact. */
function mapListCache<T>(current: unknown, fn: (items: T[]) => T[]): unknown {
  if (Array.isArray(current)) return fn(current as T[]);
  if (isEnvelope<T>(current)) return { ...current, items: fn(current.items) };
  return current;
}

/** Prepend a (usually temporary) optimistic item to a list cache. */
export function insertIntoListCache<T>(item: T) {
  return (current: unknown): unknown =>
    mapListCache<T>(current, (items) => [item, ...items]);
}

/** Patch the item whose `idField` matches `id`, merging `patch` into it. */
export function updateInListCache<T extends object>(
  id: string | number,
  patch: Partial<T>,
  idField: keyof T = 'id' as keyof T,
) {
  return (current: unknown): unknown =>
    mapListCache<T>(current, (items) =>
      items.map((item) => (item[idField] === id ? { ...item, ...patch } : item)),
    );
}

/** Remove the item whose `idField` matches `id` from a list cache. */
export function removeFromListCache<T extends object>(
  id: string | number,
  idField: keyof T = 'id' as keyof T,
) {
  return (current: unknown): unknown =>
    mapListCache<T>(current, (items) =>
      items.filter((item) => item[idField] !== id),
    );
}

/**
 * Swap the temporary optimistic row for the REAL server row (same position).
 * Wire it via `onServerData` on create mutations so the fake id disappears the
 * moment the server responds — not seconds later when the refetch lands.
 */
export function replaceInListCache<T extends object>(
  tempId: string,
  serverItem: T,
  idField: keyof T = 'id' as keyof T,
) {
  return (current: unknown): unknown =>
    mapListCache<T>(current, (items) =>
      items.map((item) => (item[idField] === tempId ? serverItem : item)),
    );
}
