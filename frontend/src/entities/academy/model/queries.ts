import { useQuery } from '@tanstack/react-query';

import { useOptimisticMutation, updateInListCache } from '@/shared/lib/query';
import { academyApi } from '../api';
import type {
  Academy,
  AcademyStatus,
  CreateAcademyDto,
  ExtendAcademyDto,
  UpdateAcademyDto,
} from './types';

export const academyKeys = {
  all: ['owner-academies'] as const,
  list: () => ['owner-academies', 'list'] as const,
  payments: (academyId?: string) =>
    ['owner-payments', academyId ?? 'all'] as const,
  paymentsAll: () => ['owner-payments'] as const,
};

export function useAcademies() {
  return useQuery({
    queryKey: academyKeys.list(),
    queryFn: () => academyApi.list(),
  });
}

export function useAcademyPayments(academyId?: string) {
  return useQuery({
    queryKey: academyKeys.payments(academyId),
    queryFn: () => academyApi.payments(academyId),
  });
}

/** Create is server-driven (generates founder account) — invalidate only. */
export function useCreateAcademy() {
  return useOptimisticMutation<Academy, CreateAcademyDto>({
    mutationFn: (dto) => academyApi.create(dto),
    keysToCancel: [academyKeys.all],
    keysToInvalidate: [academyKeys.all, academyKeys.paymentsAll()],
  });
}

export function useExtendAcademy() {
  return useOptimisticMutation<Academy, { id: string; dto: ExtendAcademyDto }>({
    mutationFn: ({ id, dto }) => academyApi.extend(id, dto),
    keysToCancel: [academyKeys.all],
    keysToInvalidate: [academyKeys.all, academyKeys.paymentsAll()],
  });
}

export function useUpdateAcademy() {
  return useOptimisticMutation<Academy, { id: string; dto: UpdateAcademyDto }>({
    mutationFn: ({ id, dto }) => academyApi.update(id, dto),
    keysToCancel: [academyKeys.all],
    keysToInvalidate: [academyKeys.all],
    optimisticUpdate: ({ id, dto }, qc) => {
      qc.setQueriesData(
        { queryKey: academyKeys.all },
        updateInListCache<Academy>(id, dto as Partial<Academy>),
      );
    },
  });
}

export function useSetAcademyStatus() {
  return useOptimisticMutation<Academy, { id: string; status: AcademyStatus }>({
    mutationFn: ({ id, status }) => academyApi.setStatus(id, status),
    keysToCancel: [academyKeys.all],
    keysToInvalidate: [academyKeys.all],
    optimisticUpdate: ({ id, status }, qc) => {
      qc.setQueriesData(
        { queryKey: academyKeys.all },
        updateInListCache<Academy>(id, { status }),
      );
    },
  });
}

export function useDeleteAcademy() {
  return useOptimisticMutation<void, string>({
    mutationFn: (id) => academyApi.remove(id),
    keysToCancel: [academyKeys.all],
    keysToInvalidate: [academyKeys.all, academyKeys.paymentsAll()],
    optimisticUpdate: (id, qc) => {
      qc.setQueriesData<Academy[]>({ queryKey: academyKeys.all }, (old) =>
        Array.isArray(old) ? old.filter((a) => a.id !== id) : old,
      );
    },
  });
}
