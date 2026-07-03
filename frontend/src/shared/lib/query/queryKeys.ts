import type { QueryKey } from '@tanstack/react-query';

/**
 * Standardized query-key factory shared by every entity slice.
 *
 * Convention (matches entities/<name>/model/queries.ts `<name>Keys`):
 *   all      -> [scope]                     invalidate everything for the entity
 *   lists    -> [scope, 'list']             invalidate all list variants
 *   list(p)  -> [scope, 'list', params]     a specific filtered/paginated list
 *   details  -> [scope, 'detail']           invalidate all detail queries
 *   detail(id) -> [scope, 'detail', id]     a single entity by id
 *
 * Usage:
 *   export const studentKeys = createQueryKeys('students');
 *   studentKeys.list({ page: 1 }); // ['students', 'list', { page: 1 }]
 */
export function createQueryKeys<TScope extends string>(scope: TScope) {
  const all = [scope] as const;
  return {
    all,
    lists: () => [...all, 'list'] as const,
    list: <TParams = unknown>(params?: TParams) =>
      [...all, 'list', params ?? {}] as const,
    details: () => [...all, 'detail'] as const,
    detail: (id: string | number) => [...all, 'detail', id] as const,
  };
}

export type QueryKeys<TScope extends string = string> = ReturnType<
  typeof createQueryKeys<TScope>
>;

/** Type guard: does `key` start with every segment of `prefix`? */
export function keyStartsWith(key: QueryKey, prefix: QueryKey): boolean {
  if (prefix.length > key.length) return false;
  return prefix.every((seg, i) => Object.is(seg, key[i]));
}
