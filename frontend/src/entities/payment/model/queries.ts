import { useQuery } from '@tanstack/react-query';

import {
  createQueryKeys,
  removeFromListCache,
  updateInListCache,
  useOptimisticMutation,
} from '@/shared/lib/query';
import { paymentApi } from '../api';
import type {
  Payment,
  PaymentListParams,
  GeneratePaymentDto,
  PayPaymentDto,
  UpdatePaymentDto,
  DebtsParams,
} from './types';

export const paymentKeys = {
  ...createQueryKeys('payments'),
  debts: (params?: DebtsParams) => ['payments', 'debts', params ?? {}] as const,
  debtsAll: () => ['payments', 'debts'] as const,
};

export function usePayments(params?: PaymentListParams) {
  return useQuery({
    queryKey: paymentKeys.list(params),
    queryFn: () => paymentApi.list(params),
  });
}

export function usePayment(id: string | undefined) {
  return useQuery({
    queryKey: paymentKeys.detail(id ?? ''),
    queryFn: () => paymentApi.getById(id as string),
    enabled: Boolean(id),
  });
}

export function useDebts(params?: DebtsParams) {
  return useQuery({
    queryKey: paymentKeys.debts(params),
    queryFn: () => paymentApi.debts(params),
  });
}

/** Generate current-period payments — server upserts; just invalidate. */
export function useGeneratePayments() {
  return useOptimisticMutation<Payment[], GeneratePaymentDto>({
    mutationFn: (dto) => paymentApi.generate(dto),
    keysToInvalidate: [paymentKeys.lists(), paymentKeys.debtsAll()],
  });
}

/** Mark a payment PAID (PATCH /payments/:id/pay). */
export function usePayPayment() {
  return useOptimisticMutation<Payment, { id: string; dto?: PayPaymentDto }>({
    mutationFn: ({ id, dto }) => paymentApi.pay(id, dto),
    keysToCancel: [paymentKeys.lists(), paymentKeys.details()],
    keysToInvalidate: [
      paymentKeys.lists(),
      paymentKeys.details(),
      paymentKeys.debtsAll(),
    ],
    optimisticUpdate: ({ id, dto }, qc) => {
      const paidAt = dto?.paidAt ?? new Date().toISOString();
      qc.setQueriesData(
        { queryKey: paymentKeys.lists() },
        updateInListCache<Payment>(id, { status: 'PAID', paidAt }),
      );
      qc.setQueryData<Payment>(paymentKeys.detail(id), (old) =>
        old ? { ...old, status: 'PAID', paidAt } : old,
      );
    },
  });
}

export function useUpdatePayment() {
  return useOptimisticMutation<Payment, { id: string; dto: UpdatePaymentDto }>({
    mutationFn: ({ id, dto }) => paymentApi.update(id, dto),
    keysToCancel: [paymentKeys.lists(), paymentKeys.details()],
    keysToInvalidate: [
      paymentKeys.lists(),
      paymentKeys.details(),
      paymentKeys.debtsAll(),
    ],
    optimisticUpdate: ({ id, dto }, qc) => {
      qc.setQueriesData(
        { queryKey: paymentKeys.lists() },
        updateInListCache<Payment>(id, dto),
      );
      qc.setQueryData<Payment>(paymentKeys.detail(id), (old) =>
        old ? { ...old, ...dto } : old,
      );
    },
  });
}

export function useDeletePayment() {
  return useOptimisticMutation<void, string>({
    mutationFn: (id) => paymentApi.remove(id),
    keysToCancel: [paymentKeys.lists()],
    keysToInvalidate: [paymentKeys.lists(), paymentKeys.debtsAll()],
    optimisticUpdate: (id, qc) => {
      qc.setQueriesData(
        { queryKey: paymentKeys.lists() },
        removeFromListCache<Payment>(id),
      );
    },
  });
}
