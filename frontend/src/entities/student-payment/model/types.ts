import type { PaginationParams } from '@/shared/lib/query';

/** How a subscription payment was tendered. */
export type PaymentMethod = 'CASH' | 'CARD';

/**
 * A recorded student subscription (абонемент) payment. Always PAID at creation
 * time — this is a separate feature from the FOUNDER-only monthly billing
 * (/finance/payments). `groupId` is nullable (student's single ACTIVE group).
 */
export interface StudentPayment {
  id: string;
  studentId: string;
  groupId: string | null;
  branchId: string;
  amount: number;
  method: PaymentMethod;
  status: 'PAID';
  paidAt: string;
  student: { id: string; firstName: string; lastName: string };
  group: { id: string; name: string } | null;
  branch: { id: string; name: string };
}

/** POST /student-payments body. */
export interface RecordPaymentDto {
  studentId: string;
  /** > 0 and <= 99999999.99. */
  amount: number;
  method: PaymentMethod;
}

/** GET /student-payments query. */
export interface StudentPaymentListParams extends PaginationParams {
  /** Matches student first/last name. */
  search?: string;
  branchId?: string;
  method?: PaymentMethod;
  /** Filter on paidAt. */
  from?: string;
  to?: string;
}
