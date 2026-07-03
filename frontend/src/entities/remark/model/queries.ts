import { useQuery } from '@tanstack/react-query';

import {
  createQueryKeys,
  insertIntoListCache,
  removeFromListCache,
  useOptimisticMutation,
} from '@/shared/lib/query';
import { remarkApi } from '../api';
import type { Remark, RemarkListParams, CreateRemarkDto } from './types';

export const remarkKeys = createQueryKeys('remarks');

export function useRemarks(params?: RemarkListParams) {
  return useQuery({
    queryKey: remarkKeys.list(params),
    queryFn: () => remarkApi.list(params),
  });
}

export function useCreateRemark() {
  return useOptimisticMutation<Remark, CreateRemarkDto>({
    mutationFn: (dto) => remarkApi.create(dto),
    keysToCancel: [remarkKeys.lists()],
    keysToInvalidate: [remarkKeys.lists()],
    optimisticUpdate: (dto, qc) => {
      const optimistic: Remark = {
        id: `optimistic-${Date.now()}`,
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
