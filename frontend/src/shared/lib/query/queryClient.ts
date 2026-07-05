import { QueryClient } from '@tanstack/react-query';

/**
 * Factory for the app-wide QueryClient with CRM-tuned defaults:
 * - no refetch-on-focus spam, 1 retry, 60s freshness, 10m cache.
 * Freshness is safe to keep long: every mutation invalidates its keys, which
 * bypasses staleTime — the cache only serves "stale" data that nothing changed.
 * Kept here so both the app provider and tests can build an identical client.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 10 * 60_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}
