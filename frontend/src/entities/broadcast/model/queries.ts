import { keepPreviousData, useQuery } from '@tanstack/react-query';

import {
  createQueryKeys,
  insertIntoListCache,
  makeOptimisticId,
  replaceInListCache,
  useOptimisticMutation,
} from '@/shared/lib/query';
import { broadcastApi } from '../api';
import type { Broadcast, BroadcastListParams, CreateBroadcastDto } from './types';

export const broadcastKeys = createQueryKeys('broadcasts');

/** Paginated broadcast history (INTEGRATION API: GET /broadcasts). */
export function useBroadcasts(params?: BroadcastListParams) {
  return useQuery({
    queryKey: broadcastKeys.list(params),
    queryFn: () => broadcastApi.list(params),
    placeholderData: keepPreviousData,
  });
}

/** Single broadcast detail/status (INTEGRATION API: GET /broadcasts/:id). */
export function useBroadcast(id: string | undefined) {
  return useQuery({
    queryKey: broadcastKeys.detail(id ?? ''),
    queryFn: () => broadcastApi.getById(id as string),
    enabled: Boolean(id),
  });
}

/**
 * Send a broadcast (INTEGRATION API: POST /broadcasts). Optimistically prepends
 * a QUEUED row to every history list so the send feels instant; onSettled
 * invalidation reconciles with the real record + delivery status.
 */
export function useCreateBroadcast() {
  return useOptimisticMutation<Broadcast, CreateBroadcastDto, { tempId: string }>({
    mutationFn: (dto) => broadcastApi.create(dto),
    keysToCancel: [broadcastKeys.lists()],
    keysToInvalidate: [broadcastKeys.lists()],
    optimisticUpdate: (dto, qc) => {
      const tempId = makeOptimisticId();
      const optimistic: Broadcast = {
        id: tempId,
        title: dto.title ?? null,
        text: dto.text,
        audience: dto.audience,
        groupId: dto.groupId ?? null,
        status: 'QUEUED',
        recipientCount: null,
        sentCount: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      qc.setQueriesData(
        { queryKey: broadcastKeys.lists() },
        insertIntoListCache(optimistic),
      );
      return { tempId };
    },
    onServerData: (created, _vars, qc, extra) => {
      if (!extra?.tempId) return;
      qc.setQueriesData(
        { queryKey: broadcastKeys.lists() },
        replaceInListCache(extra.tempId, created),
      );
    },
  });
}
