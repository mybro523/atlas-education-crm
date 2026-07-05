import { keepPreviousData, useQuery } from '@tanstack/react-query';

import {
  createQueryKeys,
  insertIntoListCache,
  removeFromListCache,
  updateInListCache,
  useOptimisticMutation,
} from '@/shared/lib/query';
import { financeRecordApi } from '../api';
import type {
  FinanceRecord,
  FinanceRecordListParams,
  CreateFinanceRecordDto,
  UpdateFinanceRecordDto,
} from './types';

export const financeRecordKeys = createQueryKeys('finance-records');

export function useFinanceRecords(params?: FinanceRecordListParams) {
  return useQuery({
    queryKey: financeRecordKeys.list(params),
    queryFn: () => financeRecordApi.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useFinanceRecord(id: string | undefined) {
  return useQuery({
    queryKey: financeRecordKeys.detail(id ?? ''),
    queryFn: () => financeRecordApi.getById(id as string),
    enabled: Boolean(id),
  });
}

export function useCreateFinanceRecord() {
  return useOptimisticMutation<FinanceRecord, CreateFinanceRecordDto>({
    mutationFn: (dto) => financeRecordApi.create(dto),
    keysToCancel: [financeRecordKeys.lists()],
    keysToInvalidate: [financeRecordKeys.lists()],
    optimisticUpdate: (dto, qc) => {
      const optimistic: FinanceRecord = {
        id: `optimistic-${Date.now()}`,
        branchId: dto.branchId,
        type: dto.type,
        amount: dto.amount,
        category: dto.category ?? null,
        description: dto.description ?? null,
        occurredAt: dto.occurredAt ?? new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      qc.setQueriesData(
        { queryKey: financeRecordKeys.lists() },
        insertIntoListCache(optimistic),
      );
    },
  });
}

export function useUpdateFinanceRecord() {
  return useOptimisticMutation<
    FinanceRecord,
    { id: string; dto: UpdateFinanceRecordDto }
  >({
    mutationFn: ({ id, dto }) => financeRecordApi.update(id, dto),
    keysToCancel: [financeRecordKeys.lists(), financeRecordKeys.details()],
    keysToInvalidate: [financeRecordKeys.lists(), financeRecordKeys.details()],
    optimisticUpdate: ({ id, dto }, qc) => {
      qc.setQueriesData(
        { queryKey: financeRecordKeys.lists() },
        updateInListCache<FinanceRecord>(id, dto),
      );
      qc.setQueryData<FinanceRecord>(financeRecordKeys.detail(id), (old) =>
        old ? { ...old, ...dto } : old,
      );
    },
  });
}

export function useDeleteFinanceRecord() {
  return useOptimisticMutation<void, string>({
    mutationFn: (id) => financeRecordApi.remove(id),
    keysToCancel: [financeRecordKeys.lists()],
    keysToInvalidate: [financeRecordKeys.lists()],
    optimisticUpdate: (id, qc) => {
      qc.setQueriesData(
        { queryKey: financeRecordKeys.lists() },
        removeFromListCache<FinanceRecord>(id),
      );
    },
  });
}
