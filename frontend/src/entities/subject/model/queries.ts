import { useQuery } from '@tanstack/react-query';

import {
  createQueryKeys,
  insertIntoListCache,
  removeFromListCache,
  updateInListCache,
  useOptimisticMutation,
} from '@/shared/lib/query';
import { subjectApi } from '../api';
import type { Subject, CreateSubjectDto, UpdateSubjectDto } from './types';

export const subjectKeys = createQueryKeys('subjects');

export function useSubjects() {
  return useQuery({
    queryKey: subjectKeys.list(),
    queryFn: () => subjectApi.list(),
  });
}

export function useSubject(id: string | undefined) {
  return useQuery({
    queryKey: subjectKeys.detail(id ?? ''),
    queryFn: () => subjectApi.getById(id as string),
    enabled: Boolean(id),
  });
}

export function useCreateSubject() {
  return useOptimisticMutation<Subject, CreateSubjectDto>({
    mutationFn: (dto) => subjectApi.create(dto),
    keysToCancel: [subjectKeys.lists()],
    keysToInvalidate: [subjectKeys.lists()],
    optimisticUpdate: (dto, qc) => {
      const optimistic: Subject = {
        id: `optimistic-${Date.now()}`,
        name: dto.name,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      qc.setQueriesData(
        { queryKey: subjectKeys.lists() },
        insertIntoListCache(optimistic),
      );
    },
  });
}

export function useUpdateSubject() {
  return useOptimisticMutation<Subject, { id: string; dto: UpdateSubjectDto }>({
    mutationFn: ({ id, dto }) => subjectApi.update(id, dto),
    keysToCancel: [subjectKeys.lists(), subjectKeys.details()],
    keysToInvalidate: [subjectKeys.lists(), subjectKeys.details()],
    optimisticUpdate: ({ id, dto }, qc) => {
      qc.setQueriesData(
        { queryKey: subjectKeys.lists() },
        updateInListCache<Subject>(id, dto),
      );
      qc.setQueryData<Subject>(subjectKeys.detail(id), (old) =>
        old ? { ...old, ...dto } : old,
      );
    },
  });
}

export function useDeleteSubject() {
  return useOptimisticMutation<void, string>({
    mutationFn: (id) => subjectApi.remove(id),
    keysToCancel: [subjectKeys.lists()],
    keysToInvalidate: [subjectKeys.lists()],
    optimisticUpdate: (id, qc) => {
      qc.setQueriesData(
        { queryKey: subjectKeys.lists() },
        removeFromListCache<Subject>(id),
      );
    },
  });
}
