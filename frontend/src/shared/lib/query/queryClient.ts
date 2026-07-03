import { QueryClient } from '@tanstack/react-query';

/**
 * Factory for the app-wide QueryClient with CRM-tuned defaults:
 * - no refetch-on-focus spam, 1 retry, 30s freshness, 5m cache.
 * Kept here so both the app provider and tests can build an identical client.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}
