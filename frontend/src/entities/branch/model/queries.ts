import { useQuery } from '@tanstack/react-query';

import {
  createQueryKeys,
  insertIntoListCache,
  makeOptimisticId,
  removeFromListCache,
  replaceInListCache,
  updateInListCache,
  useOptimisticMutation,
} from '@/shared/lib/query';
import { branchApi } from '../api';
import type { Branch, CreateBranchDto, UpdateBranchDto } from './types';

export const branchKeys = createQueryKeys('branches');

export function useBranches() {
  return useQuery({
    queryKey: branchKeys.list(),
    queryFn: () => branchApi.list(),
  });
}

export function useBranch(id: string | undefined) {
  return useQuery({
    queryKey: branchKeys.detail(id ?? ''),
    queryFn: () => branchApi.getById(id as string),
    enabled: Boolean(id),
  });
}

export function useCreateBranch() {
  return useOptimisticMutation<Branch, CreateBranchDto, { tempId: string }>({
    mutationFn: (dto) => branchApi.create(dto),
    keysToCancel: [branchKeys.lists()],
    keysToInvalidate: [branchKeys.lists()],
    optimisticUpdate: (dto, qc) => {
      const tempId = makeOptimisticId();
      const optimistic: Branch = {
        id: tempId,
        name: dto.name,
        address: dto.address ?? null,
        phone: dto.phone ?? null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      qc.setQueriesData(
        { queryKey: branchKeys.lists() },
        insertIntoListCache(optimistic),
      );
      return { tempId };
    },
    onServerData: (created, _vars, qc, extra) => {
      if (!extra?.tempId) return;
      qc.setQueriesData(
        { queryKey: branchKeys.lists() },
        replaceInListCache(extra.tempId, created),
      );
    },
  });
}

export function useUpdateBranch() {
  return useOptimisticMutation<Branch, { id: string; dto: UpdateBranchDto }>({
    mutationFn: ({ id, dto }) => branchApi.update(id, dto),
    keysToCancel: [branchKeys.lists(), branchKeys.details()],
    keysToInvalidate: [branchKeys.lists(), branchKeys.details()],
    optimisticUpdate: ({ id, dto }, qc) => {
      qc.setQueriesData(
        { queryKey: branchKeys.lists() },
        updateInListCache<Branch>(id, dto),
      );
      qc.setQueryData<Branch>(branchKeys.detail(id), (old) =>
        old ? { ...old, ...dto } : old,
      );
    },
    onServerData: (row, vars, qc) => {
      qc.setQueriesData(
        { queryKey: branchKeys.lists() },
        updateInListCache<Branch>(vars.id, row),
      );
      qc.setQueryData(branchKeys.detail(vars.id), row);
    },
  });
}

export function useDeleteBranch() {
  return useOptimisticMutation<void, string>({
    mutationFn: (id) => branchApi.remove(id),
    keysToCancel: [branchKeys.lists()],
    keysToInvalidate: [branchKeys.lists()],
    optimisticUpdate: (id, qc) => {
      qc.setQueriesData(
        { queryKey: branchKeys.lists() },
        removeFromListCache<Branch>(id),
      );
    },
  });
}
