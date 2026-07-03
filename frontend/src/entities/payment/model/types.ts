import type { PaginationParams } from '@/shared/lib/query';

export type PaymentStatus = 'UNPAID' | 'PAID';

/** Monthly tuition payment (API_CONTRACT §12). Anchored to enrollmentDate. */
export interface Payment {
  id: string;
  studentId: string;
  groupId: string;
  branchId: string;
  amount: number;
  status: PaymentStatus;
  billingMonthStart: string;
  billingMonthEnd: string;
  paidAt?: string | null;
  createdAt: string;
  updatedAt: string;
  student?: { id: string; firstName: string; lastName: string };
  group?: { id: string; name: string };
}

export interface PaymentListParams extends PaginationParams {
  status?: PaymentStatus;
  branchId?: string;
  studentId?: string;
  groupId?: string;
  /** Filter on billingMonthStart. */
  from?: string;
  to?: string;
}

/** POST /payments/generate body. */
export interface GeneratePaymentDto {
  studentId?: string;
  groupId?: string;
  /** Reference date (default now). */
  ref?: string;
}

/** PATCH /payments/:id/pay body (optional). */
export interface PayPaymentDto {
  paidAt?: string;
}

/** PATCH /payments/:id body — edit amount/status. */
export interface UpdatePaymentDto {
  amount?: number;
  status?: PaymentStatus;
}

/** GET /payments/debts query. */
export interface DebtsParams {
  branchId?: string;
  studentId?: string;
  asOf?: string;
}

/** GET /payments/debts response. */
export interface DebtsReport {
  totalDebt: number;
  byStudent: Array<{
    studentId: string;
    studentName: string;
    branchId: string;
    unpaidPeriods: number;
    amountDue: number;
    payments: Array<{
      id: string;
      billingMonthStart: string;
      billingMonthEnd: string;
      amount: number;
    }>;
  }>;
}
