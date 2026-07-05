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
import { studentApi } from '../api';
import type {
  Student,
  StudentListParams,
  CreateStudentDto,
  UpdateStudentDto,
  Parent,
  CreateParentDto,
  UpdateParentDto,
} from './types';

export const studentKeys = {
  ...createQueryKeys('students'),
  parents: (studentId: string) =>
    ['students', 'detail', studentId, 'parents'] as const,
};

export function useStudents(params?: StudentListParams) {
  return useQuery({
    queryKey: studentKeys.list(params),
    queryFn: () => studentApi.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useStudent(id: string | undefined) {
  return useQuery({
    queryKey: studentKeys.detail(id ?? ''),
    queryFn: () => studentApi.getById(id as string),
    enabled: Boolean(id),
  });
}

export function useStudentParents(studentId: string | undefined) {
  return useQuery({
    queryKey: studentKeys.parents(studentId ?? ''),
    queryFn: () => studentApi.listParents(studentId as string),
    enabled: Boolean(studentId),
  });
}

export function useCreateStudent() {
  return useOptimisticMutation<Student, CreateStudentDto, { tempId: string }>({
    mutationFn: (dto) => studentApi.create(dto),
    keysToCancel: [studentKeys.lists()],
    keysToInvalidate: [studentKeys.lists()],
    optimisticUpdate: (dto, qc) => {
      const tempId = makeOptimisticId();
      const optimistic: Student = {
        id: tempId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        middleName: dto.middleName ?? null,
        birthDate: dto.birthDate ?? null,
        phone: dto.phone ?? null,
        branchId: dto.branchId,
        courseId: dto.courseId ?? null,
        level: dto.level ?? null,
        referralSource: dto.referralSource ?? null,
        courseFee: dto.courseFee ?? null,
        enrollmentDate: dto.enrollmentDate ?? new Date().toISOString(),
        isActive: dto.isActive ?? true,
        userId: dto.userId ?? null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        parents: [],
      };
      qc.setQueriesData(
        { queryKey: studentKeys.lists() },
        insertIntoListCache(optimistic),
      );
      return { tempId };
    },
    onServerData: (created, _vars, qc, extra) => {
      if (!extra?.tempId) return;
      qc.setQueriesData(
        { queryKey: studentKeys.lists() },
        replaceInListCache(extra.tempId, created),
      );
    },
  });
}

export function useUpdateStudent() {
  return useOptimisticMutation<Student, { id: string; dto: UpdateStudentDto }>({
    mutationFn: ({ id, dto }) => studentApi.update(id, dto),
    keysToCancel: [studentKeys.lists(), studentKeys.details()],
    keysToInvalidate: [studentKeys.lists(), studentKeys.details()],
    optimisticUpdate: ({ id, dto }, qc) => {
      qc.setQueriesData(
        { queryKey: studentKeys.lists() },
        updateInListCache<Student>(id, dto),
      );
      qc.setQueryData<Student>(studentKeys.detail(id), (old) =>
        old ? { ...old, ...dto } : old,
      );
    },
    onServerData: (row, vars, qc) => {
      qc.setQueriesData(
        { queryKey: studentKeys.lists() },
        updateInListCache<Student>(vars.id, row),
      );
      qc.setQueryData<Student>(studentKeys.detail(vars.id), row);
    },
  });
}

export function useDeleteStudent() {
  return useOptimisticMutation<void, string>({
    mutationFn: (id) => studentApi.remove(id),
    keysToCancel: [studentKeys.lists()],
    keysToInvalidate: [studentKeys.lists()],
    optimisticUpdate: (id, qc) => {
      qc.setQueriesData(
        { queryKey: studentKeys.lists() },
        removeFromListCache<Student>(id),
      );
    },
  });
}

// --- Nested parents ---

export function useAddParent() {
  return useOptimisticMutation<
    Parent,
    { studentId: string; dto: CreateParentDto },
    { tempId: string }
  >({
    mutationFn: ({ studentId, dto }) => studentApi.addParent(studentId, dto),
    keysToCancel: (v) => [studentKeys.parents(v.studentId)],
    keysToInvalidate: (v) => [
      studentKeys.parents(v.studentId),
      studentKeys.detail(v.studentId),
    ],
    optimisticUpdate: ({ studentId, dto }, qc) => {
      const tempId = makeOptimisticId();
      const optimistic: Parent = {
        id: tempId,
        studentId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        relation: dto.relation ?? 'OTHER',
        position: dto.position ?? null,
        workplace: dto.workplace ?? null,
      };
      qc.setQueryData<Parent[]>(studentKeys.parents(studentId), (old) =>
        old ? [...old, optimistic] : [optimistic],
      );
      return { tempId };
    },
    onServerData: (created, vars, qc, extra) => {
      if (!extra?.tempId) return;
      qc.setQueryData<Parent[]>(studentKeys.parents(vars.studentId), (old) =>
        old?.map((p) => (p.id === extra.tempId ? created : p)),
      );
    },
  });
}

export function useUpdateParent() {
  return useOptimisticMutation<
    Parent,
    { studentId: string; parentId: string; dto: UpdateParentDto }
  >({
    mutationFn: ({ studentId, parentId, dto }) =>
      studentApi.updateParent(studentId, parentId, dto),
    keysToCancel: (v) => [studentKeys.parents(v.studentId)],
    keysToInvalidate: (v) => [
      studentKeys.parents(v.studentId),
      studentKeys.detail(v.studentId),
    ],
    optimisticUpdate: ({ studentId, parentId, dto }, qc) => {
      qc.setQueryData<Parent[]>(studentKeys.parents(studentId), (old) =>
        old?.map((p) => (p.id === parentId ? { ...p, ...dto } : p)),
      );
    },
    onServerData: (row, vars, qc) => {
      qc.setQueryData<Parent[]>(studentKeys.parents(vars.studentId), (old) =>
        old?.map((p) => (p.id === vars.parentId ? row : p)),
      );
    },
  });
}

export function useDeleteParent() {
  return useOptimisticMutation<
    void,
    { studentId: string; parentId: string }
  >({
    mutationFn: ({ studentId, parentId }) =>
      studentApi.removeParent(studentId, parentId),
    keysToCancel: (v) => [studentKeys.parents(v.studentId)],
    keysToInvalidate: (v) => [
      studentKeys.parents(v.studentId),
      studentKeys.detail(v.studentId),
    ],
    optimisticUpdate: ({ studentId, parentId }, qc) => {
      qc.setQueryData<Parent[]>(studentKeys.parents(studentId), (old) =>
        old?.filter((p) => p.id !== parentId),
      );
    },
  });
}
