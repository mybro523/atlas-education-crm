import {
  keepPreviousData,
  useQuery,
  type QueryClient,
} from '@tanstack/react-query';

import {
  createQueryKeys,
  insertIntoListCache,
  makeOptimisticId,
  removeFromListCache,
  replaceInListCache,
  updateInListCache,
  useOptimisticMutation,
} from '@/shared/lib/query';
import { groupApi } from '../api';
import type {
  Group,
  GroupListParams,
  GroupStudent,
  GroupStudentsParams,
  GroupAvailableStudentsParams,
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
  availableStudents: (
    groupId: string,
    params?: GroupAvailableStudentsParams,
  ) =>
    ['groups', 'detail', groupId, 'available-students', params ?? {}] as const,
  availableStudentsAll: (groupId: string) =>
    ['groups', 'detail', groupId, 'available-students'] as const,
};

export function useGroups(params?: GroupListParams) {
  return useQuery({
    queryKey: groupKeys.list(params),
    queryFn: () => groupApi.list(params),
    placeholderData: keepPreviousData,
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
    placeholderData: keepPreviousData,
  });
}

/**
 * Pool of students that can still be enrolled into the group (cross-branch,
 * excluding current active members). `keepPreviousData` keeps the previous
 * results visible while the user types in the search box.
 */
export function useAvailableStudents(
  groupId: string | undefined,
  params?: GroupAvailableStudentsParams,
) {
  return useQuery({
    queryKey: groupKeys.availableStudents(groupId ?? '', params),
    queryFn: () => groupApi.listAvailableStudents(groupId as string, params),
    enabled: Boolean(groupId),
    placeholderData: keepPreviousData,
  });
}

export function useCreateGroup() {
  return useOptimisticMutation<Group, CreateGroupDto, { tempId: string }>({
    mutationFn: (dto) => groupApi.create(dto),
    keysToCancel: [groupKeys.lists()],
    keysToInvalidate: [groupKeys.lists()],
    optimisticUpdate: (dto, qc) => {
      const tempId = makeOptimisticId();
      const optimistic: Group = {
        id: tempId,
        name: dto.name,
        courseId: dto.courseId,
        teacherId: dto.teacherId ?? null,
        branchId: dto.branchId,
        isActive: dto.isActive ?? true,
        studentsCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      qc.setQueriesData(
        { queryKey: groupKeys.lists() },
        insertIntoListCache(optimistic),
      );
      return { tempId };
    },
    onServerData: (created, _vars, qc, extra) => {
      if (!extra?.tempId) return;
      qc.setQueriesData(
        { queryKey: groupKeys.lists() },
        replaceInListCache(extra.tempId, created),
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
    onServerData: (row, vars, qc) => {
      qc.setQueriesData(
        { queryKey: groupKeys.lists() },
        updateInListCache<Group>(vars.id, row),
      );
      // Merge (not replace) so detail-only populated fields survive until refetch.
      qc.setQueryData<Group>(groupKeys.detail(vars.id), (old) =>
        old ? { ...old, ...row } : row,
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

/**
 * Shift a group's `studentsCount` by `delta` in every list cache page AND the
 * detail cache, clamped at 0. Keeps the member badge instantly in sync when a
 * student is added/removed, before the server round-trip settles.
 */
function adjustStudentsCount(
  qc: QueryClient,
  groupId: string,
  delta: number,
): void {
  const bump = (count: number | undefined) => Math.max(0, (count ?? 0) + delta);
  qc.setQueriesData<{ items?: Group[] } | Group[]>(
    { queryKey: groupKeys.lists() },
    (current) => {
      if (!current) return current;
      const patch = (g: Group): Group =>
        g.id === groupId ? { ...g, studentsCount: bump(g.studentsCount) } : g;
      if (Array.isArray(current)) return current.map(patch);
      if (Array.isArray(current.items)) {
        return { ...current, items: current.items.map(patch) };
      }
      return current;
    },
  );
  qc.setQueryData<Group>(groupKeys.detail(groupId), (old) =>
    old ? { ...old, studentsCount: bump(old.studentsCount) } : old,
  );
}

/**
 * Enrol a student into a group. Idempotent-friendly (the backend re-opens or
 * no-ops existing links). Optimistically increments the group's `studentsCount`
 * in the list + detail caches, and refreshes the members + available-students
 * lists on settle. `keysToInvalidate` also reconciles the count with the server.
 */
export function useAddGroupStudent() {
  return useOptimisticMutation<
    GroupStudent,
    {
      groupId: string;
      dto: AddGroupStudentDto;
      /** Optional student projection so the member list updates INSTANTLY. */
      student?: {
        id: string;
        firstName: string;
        lastName: string;
        phone?: string | null;
      };
    },
    { tempId: string }
  >({
    mutationFn: ({ groupId, dto }) => groupApi.addStudent(groupId, dto),
    keysToCancel: (v) => [
      groupKeys.studentsAll(v.groupId),
      groupKeys.lists(),
      groupKeys.detail(v.groupId),
    ],
    keysToInvalidate: (v) => [
      groupKeys.studentsAll(v.groupId),
      groupKeys.availableStudentsAll(v.groupId),
      groupKeys.detail(v.groupId),
      groupKeys.lists(),
    ],
    optimisticUpdate: ({ groupId, student }, qc) => {
      adjustStudentsCount(qc, groupId, +1);
      // Instantly insert the new member into the group's member list cache.
      if (!student) return;
      const tempId = makeOptimisticId();
      qc.setQueriesData<GroupStudent[]>(
        { queryKey: groupKeys.studentsAll(groupId) },
        (old) => {
          if (old?.some((m) => m.studentId === student.id)) return old;
          const optimistic: GroupStudent = {
            id: tempId,
            groupId,
            studentId: student.id,
            joinedAt: new Date().toISOString(),
            leftAt: null,
            student: {
              id: student.id,
              firstName: student.firstName,
              lastName: student.lastName,
              phone: student.phone ?? null,
            },
          };
          return old ? [...old, optimistic] : [optimistic];
        },
      );
      return { tempId };
    },
    onServerData: (created, vars, qc, extra) => {
      if (!extra?.tempId) return;
      // Members live under studentsAll (NOT lists()) — swap on the same key.
      qc.setQueriesData(
        { queryKey: groupKeys.studentsAll(vars.groupId) },
        replaceInListCache(extra.tempId, created),
      );
    },
  });
}

export function useRemoveGroupStudent() {
  return useOptimisticMutation<
    void,
    { groupId: string; studentId: string }
  >({
    mutationFn: ({ groupId, studentId }) =>
      groupApi.removeStudent(groupId, studentId),
    keysToCancel: (v) => [
      groupKeys.studentsAll(v.groupId),
      groupKeys.lists(),
      groupKeys.detail(v.groupId),
    ],
    keysToInvalidate: (v) => [
      groupKeys.studentsAll(v.groupId),
      groupKeys.availableStudentsAll(v.groupId),
      groupKeys.detail(v.groupId),
      groupKeys.lists(),
    ],
    optimisticUpdate: ({ groupId, studentId }, qc) => {
      qc.setQueriesData<GroupStudent[]>(
        { queryKey: groupKeys.studentsAll(groupId) },
        (old) => old?.filter((m) => m.studentId !== studentId),
      );
      adjustStudentsCount(qc, groupId, -1);
    },
  });
}
