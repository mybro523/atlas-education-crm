import { useQuery } from '@tanstack/react-query';

import {
  createQueryKeys,
  insertIntoListCache,
  removeFromListCache,
  updateInListCache,
  useOptimisticMutation,
} from '@/shared/lib/query';
import { groupApi } from '../api';
import type {
  Group,
  GroupListParams,
  GroupStudent,
  GroupStudentsParams,
  CreateGroupDto,
  UpdateGroupDto,
  AddGroupStudentDto,
} from './types';

export const groupKeys = {
  ...createQueryKeys('groups'),
  students: (groupId: string, params?: GroupStudentsParams) =>
    ['groups', 'detail', groupId, 'students', params ?? {}] as const,
  studentsAll: (groupId: string) =>
    ['groups', 'detail', groupId, 'students'] as const,
};

export function useGroups(params?: GroupListParams) {
  return useQuery({
    queryKey: groupKeys.list(params),
    queryFn: () => groupApi.list(params),
  });
}

export function useGroup(id: string | undefined) {
  return useQuery({
    queryKey: groupKeys.detail(id ?? ''),
    queryFn: () => groupApi.getById(id as string),
    enabled: Boolean(id),
  });
}

export function useGroupStudents(
  groupId: string | undefined,
  params?: GroupStudentsParams,
) {
  return useQuery({
    queryKey: groupKeys.students(groupId ?? '', params),
    queryFn: () => groupApi.listStudents(groupId as string, params),
    enabled: Boolean(groupId),
  });
}

export function useCreateGroup() {
  return useOptimisticMutation<Group, CreateGroupDto>({
    mutationFn: (dto) => groupApi.create(dto),
    keysToCancel: [groupKeys.lists()],
    keysToInvalidate: [groupKeys.lists()],
    optimisticUpdate: (dto, qc) => {
      const optimistic: Group = {
        id: `optimistic-${Date.now()}`,
        name: dto.name,
        courseId: dto.courseId,
        teacherId: dto.teacherId ?? null,
        branchId: dto.branchId,
        isActive: dto.isActive ?? true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      qc.setQueriesData(
        { queryKey: groupKeys.lists() },
        insertIntoListCache(optimistic),
      );
    },
  });
}

export function useUpdateGroup() {
  return useOptimisticMutation<Group, { id: string; dto: UpdateGroupDto }>({
    mutationFn: ({ id, dto }) => groupApi.update(id, dto),
    keysToCancel: [groupKeys.lists(), groupKeys.details()],
    keysToInvalidate: [groupKeys.lists(), groupKeys.details()],
    optimisticUpdate: ({ id, dto }, qc) => {
      qc.setQueriesData(
        { queryKey: groupKeys.lists() },
        updateInListCache<Group>(id, dto),
      );
      qc.setQueryData<Group>(groupKeys.detail(id), (old) =>
        old ? { ...old, ...dto } : old,
      );
    },
  });
}

export function useDeleteGroup() {
  return useOptimisticMutation<void, string>({
    mutationFn: (id) => groupApi.remove(id),
    keysToCancel: [groupKeys.lists()],
    keysToInvalidate: [groupKeys.lists()],
    optimisticUpdate: (id, qc) => {
      qc.setQueriesData(
        { queryKey: groupKeys.lists() },
        removeFromListCache<Group>(id),
      );
    },
  });
}

// --- Membership ---

export function useAddGroupStudent() {
  return useOptimisticMutation<
    GroupStudent,
    { groupId: string; dto: AddGroupStudentDto }
  >({
    mutationFn: ({ groupId, dto }) => groupApi.addStudent(groupId, dto),
    keysToCancel: (v) => [groupKeys.studentsAll(v.groupId)],
    keysToInvalidate: (v) => [
      groupKeys.studentsAll(v.groupId),
      groupKeys.detail(v.groupId),
    ],
  });
}

export function useRemoveGroupStudent() {
  return useOptimisticMutation<
    void,
    { groupId: string; studentId: string }
  >({
    mutationFn: ({ groupId, studentId }) =>
      groupApi.removeStudent(groupId, studentId),
    keysToCancel: (v) => [groupKeys.studentsAll(v.groupId)],
    keysToInvalidate: (v) => [
      groupKeys.studentsAll(v.groupId),
      groupKeys.detail(v.groupId),
    ],
    optimisticUpdate: ({ groupId, studentId }, qc) => {
      qc.setQueriesData<GroupStudent[]>(
        { queryKey: groupKeys.studentsAll(groupId) },
        (old) => old?.filter((m) => m.studentId !== studentId),
      );
    },
  });
}
