import { useQuery } from '@tanstack/react-query';

import {
  makeOptimisticId,
  replaceInListCache,
  removeFromListCache,
  updateInListCache,
  insertIntoListCache,
  useOptimisticMutation,
} from '@/shared/lib/query';
import { staffApi } from '../api';
import type { CreateEmployeeDto, StaffUser } from './types';

export const staffKeys = {
  all: ['staff'] as const,
  list: () => ['staff', 'list'] as const,
};

export function useStaff() {
  return useQuery({
    queryKey: staffKeys.list(),
    queryFn: () => staffApi.list(),
  });
}

/** Create a staff account — optimistic row swapped for the server one. */
export function useCreateEmployee() {
  return useOptimisticMutation<
    StaffUser,
    CreateEmployeeDto,
    { tempId: string }
  >({
    mutationFn: (dto) => staffApi.create(dto),
    keysToCancel: [staffKeys.all],
    keysToInvalidate: [staffKeys.all],
    optimisticUpdate: (dto, qc) => {
      const tempId = makeOptimisticId();
      const optimistic: StaffUser = {
        id: tempId,
        email: dto.email,
        phone: null,
        role: dto.role,
        language: 'ru',
        branchId: dto.branchId ?? null,
        isActive: true,
        createdAt: new Date().toISOString(),
        fullName: `${dto.lastName} ${dto.firstName}`,
        position: dto.position ?? null,
      };
      qc.setQueriesData(
        { queryKey: staffKeys.list() },
        insertIntoListCache(optimistic),
      );
      return { tempId };
    },
    onServerData: (created, _vars, qc, extra) => {
      if (!extra?.tempId) return;
      qc.setQueriesData(
        { queryKey: staffKeys.list() },
        replaceInListCache(extra.tempId, created),
      );
    },
  });
}

/** Reset a user's password (no cache shape change). */
export function useResetStaffPassword() {
  return useOptimisticMutation<
    { ok: boolean },
    { id: string; password: string }
  >({
    mutationFn: ({ id, password }) => staffApi.resetPassword(id, password),
    keysToInvalidate: [staffKeys.all],
  });
}

/** Block / unblock an account — optimistic isActive flip. */
export function useSetStaffBlocked() {
  return useOptimisticMutation<
    { id: string; isActive: boolean },
    { id: string; blocked: boolean }
  >({
    mutationFn: ({ id, blocked }) => staffApi.setBlocked(id, blocked),
    keysToCancel: [staffKeys.all],
    keysToInvalidate: [staffKeys.all],
    optimisticUpdate: ({ id, blocked }, qc) => {
      qc.setQueriesData(
        { queryKey: staffKeys.list() },
        updateInListCache<StaffUser>(id, { isActive: !blocked }),
      );
    },
  });
}

/** Delete a staff account — optimistic removal. */
export function useDeleteStaff() {
  return useOptimisticMutation<{ id: string }, string>({
    mutationFn: (id) => staffApi.remove(id),
    keysToCancel: [staffKeys.all],
    keysToInvalidate: [staffKeys.all],
    optimisticUpdate: (id, qc) => {
      qc.setQueriesData(
        { queryKey: staffKeys.list() },
        removeFromListCache<StaffUser>(id),
      );
    },
  });
}
