import {
  keepPreviousData,
  useQuery,
  type QueryClient,
} from '@tanstack/react-query';

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

/** Analytics summary cache prefix (kept raw to avoid a cross-entity import). */
const ANALYTICS_KEY = ['analytics'] as const;

/** Instantly nudge the analytics Overview totals so a new income/expense shows
 * without a page refresh; a refetch (invalidation) then reconciles the exact
 * figures (branch breakdown, series, date-range filtering). */
function bumpAnalytics(
  qc: QueryClient,
  type: 'INCOME' | 'EXPENSE',
  amount: number,
  sign: 1 | -1,
) {
  const delta = (Number(amount) || 0) * sign;
  qc.setQueriesData<{
    combined?: { income: number; expense: number; net: number; debt: number };
  }>({ queryKey: [...ANALYTICS_KEY, 'summary'] }, (old) => {
    if (!old?.combined) return old;
    const income = old.combined.income + (type === 'INCOME' ? delta : 0);
    const expense = old.combined.expense + (type === 'EXPENSE' ? delta : 0);
    return { ...old, combined: { ...old.combined, income, expense, net: income - expense } };
  });
}

export function useCreateFinanceRecord() {
  return useOptimisticMutation<FinanceRecord, CreateFinanceRecordDto>({
    mutationFn: (dto) => financeRecordApi.create(dto),
    keysToCancel: [financeRecordKeys.lists()],
    keysToInvalidate: [financeRecordKeys.lists(), ANALYTICS_KEY],
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
      bumpAnalytics(qc, dto.type, dto.amount, 1);
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
    keysToInvalidate: [
      financeRecordKeys.lists(),
      financeRecordKeys.details(),
      ANALYTICS_KEY,
    ],
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
    keysToInvalidate: [financeRecordKeys.lists(), ANALYTICS_KEY],
    optimisticUpdate: (id, qc) => {
      qc.setQueriesData(
        { queryKey: financeRecordKeys.lists() },
        removeFromListCache<FinanceRecord>(id),
      );
    },
  });
}
