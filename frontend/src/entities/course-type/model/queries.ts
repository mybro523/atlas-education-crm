import { useQuery } from '@tanstack/react-query';

import {
  createQueryKeys,
  insertIntoListCache,
  removeFromListCache,
  updateInListCache,
  useOptimisticMutation,
} from '@/shared/lib/query';
import { courseTypeApi } from '../api';
import type {
  CourseType,
  CourseTypeListParams,
  CreateCourseTypeDto,
  UpdateCourseTypeDto,
} from './types';

export const courseTypeKeys = createQueryKeys('course-types');

export function useCourseTypes(params?: CourseTypeListParams) {
  return useQuery({
    queryKey: courseTypeKeys.list(params),
    queryFn: () => courseTypeApi.list(params),
  });
}

export function useCourseType(id: string | undefined) {
  return useQuery({
    queryKey: courseTypeKeys.detail(id ?? ''),
    queryFn: () => courseTypeApi.getById(id as string),
    enabled: Boolean(id),
  });
}

export function useCreateCourseType() {
  return useOptimisticMutation<CourseType, CreateCourseTypeDto>({
    mutationFn: (dto) => courseTypeApi.create(dto),
    keysToCancel: [courseTypeKeys.lists()],
    keysToInvalidate: [courseTypeKeys.lists()],
    optimisticUpdate: (dto, qc) => {
      const optimistic: CourseType = {
        id: `optimistic-${Date.now()}`,
        name: dto.name,
        isActive: dto.isActive ?? true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      qc.setQueriesData(
        { queryKey: courseTypeKeys.lists() },
        insertIntoListCache(optimistic),
      );
    },
  });
}

export function useUpdateCourseType() {
  return useOptimisticMutation<
    CourseType,
    { id: string; dto: UpdateCourseTypeDto }
  >({
    mutationFn: ({ id, dto }) => courseTypeApi.update(id, dto),
    keysToCancel: [courseTypeKeys.lists(), courseTypeKeys.details()],
    keysToInvalidate: [courseTypeKeys.lists(), courseTypeKeys.details()],
    optimisticUpdate: ({ id, dto }, qc) => {
      qc.setQueriesData(
        { queryKey: courseTypeKeys.lists() },
        updateInListCache<CourseType>(id, dto),
      );
      qc.setQueryData<CourseType>(courseTypeKeys.detail(id), (old) =>
        old ? { ...old, ...dto } : old,
      );
    },
  });
}

export function useDeleteCourseType() {
  return useOptimisticMutation<void, string>({
    mutationFn: (id) => courseTypeApi.remove(id),
    keysToCancel: [courseTypeKeys.lists()],
    keysToInvalidate: [courseTypeKeys.lists()],
    optimisticUpdate: (id, qc) => {
      qc.setQueriesData(
        { queryKey: courseTypeKeys.lists() },
        removeFromListCache<CourseType>(id),
      );
    },
  });
}
