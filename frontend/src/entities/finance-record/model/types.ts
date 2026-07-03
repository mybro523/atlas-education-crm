import type { PaginationParams } from '@/shared/lib/query';

export type FinanceType = 'INCOME' | 'EXPENSE';

/** Manual income/expense record (API_CONTRACT §13, FOUNDER only). */
export interface FinanceRecord {
  id: string;
  branchId: string;
  type: FinanceType;
  amount: number;
  category?: string | null;
  description?: string | null;
  occurredAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface FinanceRecordListParams extends PaginationParams {
  type?: FinanceType;
  branchId?: string;
  /** Filter on occurredAt. */
  from?: string;
  to?: string;
  /** Matches category or description. */
  search?: string;
}

export interface CreateFinanceRecordDto {
  branchId: string;
  type: FinanceType;
  amount: number;
  category?: string;
  description?: string;
  occurredAt?: string;
}

export type UpdateFinanceRecordDto = Partial<CreateFinanceRecordDto>;
