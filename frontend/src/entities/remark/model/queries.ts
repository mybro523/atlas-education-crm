import { keepPreviousData, useQuery } from '@tanstack/react-query';

import {
  createQueryKeys,
  insertIntoListCache,
  makeOptimisticId,
  removeFromListCache,
  replaceInListCache,
  useOptimisticMutation,
} from '@/shared/lib/query';
import { remarkApi } from '../api';
import type { Remark, RemarkListParams, CreateRemarkDto } from './types';

export const remarkKeys = createQueryKeys('remarks');

export function useRemarks(params?: RemarkListParams) {
  return useQuery({
    queryKey: remarkKeys.list(params),
    queryFn: () => remarkApi.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useCreateRemark() {
  return useOptimisticMutation<Remark, CreateRemarkDto, { tempId: string }>({
    mutationFn: (dto) => remarkApi.create(dto),
    keysToCancel: [remarkKeys.lists()],
    keysToInvalidate: [remarkKeys.lists()],
    optimisticUpdate: (dto, qc) => {
      const tempId = makeOptimisticId();
      const optimistic: Remark = {
        id: tempId,
        studentId: dto.studentId,
        lessonId: dto.lessonId ?? null,
        text: dto.text,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      qc.setQueriesData(
        { queryKey: remarkKeys.lists() },
        insertIntoListCache(optimistic),
      );
      return { tempId };
    },
    onServerData: (created, _vars, qc, extra) => {
      if (!extra?.tempId) return;
      qc.setQueriesData(
        { queryKey: remarkKeys.lists() },
        replaceInListCache(extra.tempId, created),
      );
    },
  });
}

export function useDeleteRemark() {
  return useOptimisticMutation<void, string>({
    mutationFn: (id) => remarkApi.remove(id),
    keysToCancel: [remarkKeys.lists()],
    keysToInvalidate: [remarkKeys.lists()],
    optimisticUpdate: (id, qc) => {
      qc.setQueriesData(
        { queryKey: remarkKeys.lists() },
        removeFromListCache<Remark>(id),
      );
    },
  });
}
