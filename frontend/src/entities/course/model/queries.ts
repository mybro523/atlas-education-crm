import { keepPreviousData, useQuery } from '@tanstack/react-query';

import {
  createQueryKeys,
  insertIntoListCache,
  makeOptimisticId,
  removeFromListCache,
  replaceInListCache,
  updateInListCache,
  useOptimisticMutation,
} from '@/shared/lib/query';
import { courseApi } from '../api';
import type {
  Course,
  CourseListParams,
  CreateCourseDto,
  UpdateCourseDto,
} from './types';

export const courseKeys = createQueryKeys('courses');

export function useCourses(params?: CourseListParams) {
  return useQuery({
    queryKey: courseKeys.list(params),
    queryFn: () => courseApi.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useCourse(id: string | undefined) {
  return useQuery({
    queryKey: courseKeys.detail(id ?? ''),
    queryFn: () => courseApi.getById(id as string),
    enabled: Boolean(id),
  });
}

export function useCreateCourse() {
  return useOptimisticMutation<Course, CreateCourseDto, { tempId: string }>({
    mutationFn: (dto) => courseApi.create(dto),
    keysToCancel: [courseKeys.lists()],
    keysToInvalidate: [courseKeys.lists()],
    optimisticUpdate: (dto, qc) => {
      const tempId = makeOptimisticId();
      const optimistic: Course = {
        id: tempId,
        name: dto.name,
        courseTypeId: dto.courseTypeId,
        branchId: dto.branchId,
        pricePerMonth: dto.pricePerMonth,
        startDate: dto.startDate ?? null,
        endDate: dto.endDate ?? null,
        isActive: dto.isActive ?? true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      qc.setQueriesData(
        { queryKey: courseKeys.lists() },
        insertIntoListCache(optimistic),
      );
      return { tempId };
    },
    onServerData: (created, _vars, qc, extra) => {
      if (!extra?.tempId) return;
      qc.setQueriesData(
        { queryKey: courseKeys.lists() },
        replaceInListCache(extra.tempId, created),
      );
    },
  });
}

export function useUpdateCourse() {
  return useOptimisticMutation<Course, { id: string; dto: UpdateCourseDto }>({
    mutationFn: ({ id, dto }) => courseApi.update(id, dto),
    keysToCancel: [courseKeys.lists(), courseKeys.details()],
    keysToInvalidate: [courseKeys.lists(), courseKeys.details()],
    optimisticUpdate: ({ id, dto }, qc) => {
      qc.setQueriesData(
        { queryKey: courseKeys.lists() },
        updateInListCache<Course>(id, dto),
      );
      qc.setQueryData<Course>(courseKeys.detail(id), (old) =>
        old ? { ...old, ...dto } : old,
      );
    },
    onServerData: (row, vars, qc) => {
      qc.setQueriesData(
        { queryKey: courseKeys.lists() },
        updateInListCache<Course>(vars.id, row),
      );
      qc.setQueryData(courseKeys.detail(vars.id), row);
    },
  });
}

export function useDeleteCourse() {
  return useOptimisticMutation<void, string>({
    mutationFn: (id) => courseApi.remove(id),
    keysToCancel: [courseKeys.lists()],
    keysToInvalidate: [courseKeys.lists()],
    optimisticUpdate: (id, qc) => {
      qc.setQueriesData(
        { queryKey: courseKeys.lists() },
        removeFromListCache<Course>(id),
      );
    },
  });
}
