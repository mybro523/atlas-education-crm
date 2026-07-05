import { keepPreviousData, useQuery } from '@tanstack/react-query';

import {
  createQueryKeys,
  insertIntoListCache,
  removeFromListCache,
  updateInListCache,
  useOptimisticMutation,
} from '@/shared/lib/query';
import { teacherApi } from '../api';
import type {
  Teacher,
  TeacherListParams,
  CreateTeacherDto,
  UpdateTeacherDto,
} from './types';

export const teacherKeys = createQueryKeys('teachers');

export function useTeachers(params?: TeacherListParams) {
  return useQuery({
    queryKey: teacherKeys.list(params),
    queryFn: () => teacherApi.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useTeacher(id: string | undefined) {
  return useQuery({
    queryKey: teacherKeys.detail(id ?? ''),
    queryFn: () => teacherApi.getById(id as string),
    enabled: Boolean(id),
  });
}

export function useCreateTeacher() {
  return useOptimisticMutation<Teacher, CreateTeacherDto>({
    mutationFn: (dto) => teacherApi.create(dto),
    keysToCancel: [teacherKeys.lists()],
    keysToInvalidate: [teacherKeys.lists()],
    optimisticUpdate: (dto, qc) => {
      const optimistic: Teacher = {
        id: `optimistic-${Date.now()}`,
        firstName: dto.firstName,
        lastName: dto.lastName,
        middleName: dto.middleName ?? null,
        phone: dto.phone ?? null,
        specialty: dto.specialty ?? null,
        educationLevel: dto.educationLevel ?? null,
        telegramUsername: dto.telegramUsername ?? null,
        birthDate: dto.birthDate ?? null,
        hireDate: dto.hireDate ?? null,
        branchId: dto.branchId,
        userId: dto.userId ?? null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      qc.setQueriesData(
        { queryKey: teacherKeys.lists() },
        insertIntoListCache(optimistic),
      );
    },
  });
}

export function useUpdateTeacher() {
  return useOptimisticMutation<Teacher, { id: string; dto: UpdateTeacherDto }>({
    mutationFn: ({ id, dto }) => teacherApi.update(id, dto),
    keysToCancel: [teacherKeys.lists(), teacherKeys.details()],
    keysToInvalidate: [teacherKeys.lists(), teacherKeys.details()],
    optimisticUpdate: ({ id, dto }, qc) => {
      qc.setQueriesData(
        { queryKey: teacherKeys.lists() },
        updateInListCache<Teacher>(id, dto),
      );
      qc.setQueryData<Teacher>(teacherKeys.detail(id), (old) =>
        old ? { ...old, ...dto } : old,
      );
    },
  });
}

export function useDeleteTeacher() {
  return useOptimisticMutation<void, string>({
    mutationFn: (id) => teacherApi.remove(id),
    keysToCancel: [teacherKeys.lists()],
    keysToInvalidate: [teacherKeys.lists()],
    optimisticUpdate: (id, qc) => {
      qc.setQueriesData(
        { queryKey: teacherKeys.lists() },
        removeFromListCache<Teacher>(id),
      );
    },
  });
}
