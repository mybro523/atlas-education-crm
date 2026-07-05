import { keepPreviousData, useQuery } from '@tanstack/react-query';

import {
  createQueryKeys,
  useOptimisticMutation,
} from '@/shared/lib/query';
import { studentPaymentApi } from '../api';
import type {
  StudentPayment,
  StudentPaymentListParams,
  RecordPaymentDto,
} from './types';

export const studentPaymentKeys = createQueryKeys('student-payments');

/** Raw students list key — bumped optimistically without importing the entity. */
const STUDENTS_KEY = ['students'] as const;

/** Subscription figures we optimistically bump on the paying student. */
interface StudentSubscriptionShape {
  id: string;
  paidAmount?: number;
  owedAmount?: number;
}

/**
 * Map over a students list cache (bare array OR `{ items: [] }` envelope) and
 * apply `patch` to the row matching `studentId`, leaving meta intact.
 */
function bumpStudentInCache(studentId: string, amount: number) {
  const apply = <T extends StudentSubscriptionShape>(item: T): T => {
    if (item.id !== studentId) return item;
    const paid = (item.paidAmount ?? 0) + amount;
    const owed = Math.max(0, (item.owedAmount ?? 0) - amount);
    return { ...item, paidAmount: paid, owedAmount: owed };
  };
  return (current: unknown): unknown => {
    if (Array.isArray(current)) {
      return (current as StudentSubscriptionShape[]).map(apply);
    }
    if (
      current &&
      typeof current === 'object' &&
      Array.isArray((current as { items?: unknown }).items)
    ) {
      const env = current as { items: StudentSubscriptionShape[] };
      return { ...env, items: env.items.map(apply) };
    }
    return current;
  };
}

export function useStudentPayments(params?: StudentPaymentListParams) {
  return useQuery({
    queryKey: studentPaymentKeys.list(params),
    queryFn: () => studentPaymentApi.list(params),
    placeholderData: keepPreviousData,
  });
}

/** Subscriptions ending within `days` days (default 3) — soonest first. */
export function useUpcomingPayments(days = 3) {
  return useQuery({
    queryKey: [...studentPaymentKeys.all, 'upcoming', days] as const,
    queryFn: () => studentPaymentApi.upcoming(days),
  });
}

/**
 * Record a subscription payment. OPTIMISTIC: immediately bumps the paying
 * student's `paidAmount` (+amount) and `owedAmount` (max(0, owed-amount)) in the
 * students list caches, then invalidates students + the payments list so the
 * server truth reconciles.
 */
export function useRecordPayment() {
  return useOptimisticMutation<StudentPayment, RecordPaymentDto>({
    mutationFn: (dto) => studentPaymentApi.record(dto),
    keysToCancel: [STUDENTS_KEY],
    keysToInvalidate: [
      STUDENTS_KEY,
      studentPaymentKeys.lists(),
      // A payment moves the student's covered-until date, so the "ending soon"
      // panel must recompute too.
      [...studentPaymentKeys.all, 'upcoming'],
    ],
    optimisticUpdate: (dto, qc) => {
      qc.setQueriesData(
        { queryKey: STUDENTS_KEY },
        bumpStudentInCache(dto.studentId, dto.amount),
      );
    },
  });
}
