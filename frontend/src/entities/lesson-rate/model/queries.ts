import { useQuery } from '@tanstack/react-query';

import {
  createQueryKeys,
  insertIntoListCache,
  removeFromListCache,
  updateInListCache,
  useOptimisticMutation,
} from '@/shared/lib/query';
import { lessonRateApi } from '../api';
import type {
  LessonRate,
  LessonRateListParams,
  CreateLessonRateDto,
  UpdateLessonRateDto,
} from './types';

export const lessonRateKeys = createQueryKeys('lesson-rates');

export function useLessonRates(params?: LessonRateListParams) {
  return useQuery({
    queryKey: lessonRateKeys.list(params),
    queryFn: () => lessonRateApi.list(params),
  });
}

export function useLessonRate(id: string | undefined) {
  return useQuery({
    queryKey: lessonRateKeys.detail(id ?? ''),
    queryFn: () => lessonRateApi.getById(id as string),
    enabled: Boolean(id),
  });
}

export function useCreateLessonRate() {
  return useOptimisticMutation<LessonRate, CreateLessonRateDto>({
    mutationFn: (dto) => lessonRateApi.create(dto),
    keysToCancel: [lessonRateKeys.lists()],
    keysToInvalidate: [lessonRateKeys.lists()],
    optimisticUpdate: (dto, qc) => {
      const optimistic: LessonRate = {
        id: `optimistic-${Date.now()}`,
        groupId: dto.groupId ?? null,
        name: dto.name ?? null,
        amount: dto.amount,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      qc.setQueriesData(
        { queryKey: lessonRateKeys.lists() },
        insertIntoListCache(optimistic),
      );
    },
  });
}

export function useUpdateLessonRate() {
  return useOptimisticMutation<
    LessonRate,
    { id: string; dto: UpdateLessonRateDto }
  >({
    mutationFn: ({ id, dto }) => lessonRateApi.update(id, dto),
    keysToCancel: [lessonRateKeys.lists(), lessonRateKeys.details()],
    keysToInvalidate: [lessonRateKeys.lists(), lessonRateKeys.details()],
    optimisticUpdate: ({ id, dto }, qc) => {
      qc.setQueriesData(
        { queryKey: lessonRateKeys.lists() },
        updateInListCache<LessonRate>(id, dto),
      );
      qc.setQueryData<LessonRate>(lessonRateKeys.detail(id), (old) =>
        old ? { ...old, ...dto } : old,
      );
    },
  });
}

export function useDeleteLessonRate() {
  return useOptimisticMutation<void, string>({
    mutationFn: (id) => lessonRateApi.remove(id),
    keysToCancel: [lessonRateKeys.lists()],
    keysToInvalidate: [lessonRateKeys.lists()],
    optimisticUpdate: (id, qc) => {
      qc.setQueriesData(
        { queryKey: lessonRateKeys.lists() },
        removeFromListCache<LessonRate>(id),
      );
    },
  });
}
