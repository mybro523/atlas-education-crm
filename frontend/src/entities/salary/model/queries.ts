import { keepPreviousData, useQuery } from '@tanstack/react-query';

import {
  createQueryKeys,
  insertIntoListCache,
  removeFromListCache,
  updateInListCache,
  useOptimisticMutation,
} from '@/shared/lib/query';
import { salaryApi } from '../api';
import type {
  Salary,
  SalaryListParams,
  ComputeSalaryDto,
  SalaryComputation,
  CreateSalaryDto,
  UpdateSalaryDto,
  PaySalaryDto,
} from './types';

export const salaryKeys = createQueryKeys('salaries');

export function useSalaries(params?: SalaryListParams) {
  return useQuery({
    queryKey: salaryKeys.list(params),
    queryFn: () => salaryApi.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useSalary(id: string | undefined) {
  return useQuery({
    queryKey: salaryKeys.detail(id ?? ''),
    queryFn: () => salaryApi.getById(id as string),
    enabled: Boolean(id),
  });
}

/**
 * Compute a teacher's salary for a period. Not a cache mutation by itself; if
 * `persist` is set the server creates a row, so we invalidate lists.
 */
export function useComputeSalary() {
  return useOptimisticMutation<SalaryComputation, ComputeSalaryDto>({
    mutationFn: (dto) => salaryApi.compute(dto),
    keysToInvalidate: (v) => (v.persist ? [salaryKeys.lists()] : []),
  });
}

export function useCreateSalary() {
  return useOptimisticMutation<Salary, CreateSalaryDto>({
    mutationFn: (dto) => salaryApi.create(dto),
    keysToCancel: [salaryKeys.lists()],
    keysToInvalidate: [salaryKeys.lists()],
    optimisticUpdate: (dto, qc) => {
      const optimistic: Salary = {
        id: `optimistic-${Date.now()}`,
        teacherId: dto.teacherId ?? null,
        employeeId: dto.employeeId ?? null,
        basis: dto.basis,
        periodStart: dto.periodStart,
        periodEnd: dto.periodEnd,
        amount: dto.amount,
        status: dto.status ?? 'PENDING',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      qc.setQueriesData(
        { queryKey: salaryKeys.lists() },
        insertIntoListCache(optimistic),
      );
    },
  });
}

/** Mark a salary PAID (PATCH /finance/salaries/:id/pay). */
export function usePaySalary() {
  return useOptimisticMutation<Salary, { id: string; dto?: PaySalaryDto }>({
    mutationFn: ({ id, dto }) => salaryApi.pay(id, dto),
    keysToCancel: [salaryKeys.lists(), salaryKeys.details()],
    keysToInvalidate: [salaryKeys.lists(), salaryKeys.details()],
    optimisticUpdate: ({ id, dto }, qc) => {
      const paidAt = dto?.paidAt ?? new Date().toISOString();
      qc.setQueriesData(
        { queryKey: salaryKeys.lists() },
        updateInListCache<Salary>(id, { status: 'PAID', paidAt }),
      );
      qc.setQueryData<Salary>(salaryKeys.detail(id), (old) =>
        old ? { ...old, status: 'PAID', paidAt } : old,
      );
    },
  });
}

export function useUpdateSalary() {
  return useOptimisticMutation<Salary, { id: string; dto: UpdateSalaryDto }>({
    mutationFn: ({ id, dto }) => salaryApi.update(id, dto),
    keysToCancel: [salaryKeys.lists(), salaryKeys.details()],
    keysToInvalidate: [salaryKeys.lists(), salaryKeys.details()],
    optimisticUpdate: ({ id, dto }, qc) => {
      qc.setQueriesData(
        { queryKey: salaryKeys.lists() },
        updateInListCache<Salary>(id, dto),
      );
      qc.setQueryData<Salary>(salaryKeys.detail(id), (old) =>
        old ? { ...old, ...dto } : old,
      );
    },
  });
}

export function useDeleteSalary() {
  return useOptimisticMutation<void, string>({
    mutationFn: (id) => salaryApi.remove(id),
    keysToCancel: [salaryKeys.lists()],
    keysToInvalidate: [salaryKeys.lists()],
    optimisticUpdate: (id, qc) => {
      qc.setQueriesData(
        { queryKey: salaryKeys.lists() },
        removeFromListCache<Salary>(id),
      );
    },
  });
}
