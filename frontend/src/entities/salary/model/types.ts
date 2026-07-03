import type { PaginationParams } from '@/shared/lib/query';

export type SalaryBasis = 'PER_LESSON' | 'FIXED';
export type SalaryStatus = 'PENDING' | 'PAID';

/** Salary row (API_CONTRACT §14.1, FOUNDER only). */
export interface Salary {
  id: string;
  teacherId?: string | null;
  employeeId?: string | null;
  basis: SalaryBasis;
  periodStart: string;
  periodEnd: string;
  amount: number;
  status: SalaryStatus;
  paidAt?: string | null;
  createdAt: string;
  updatedAt: string;
  teacher?: { id: string; firstName: string; lastName: string };
  employee?: { id: string; firstName: string; lastName: string };
}

export interface SalaryListParams extends PaginationParams {
  teacherId?: string;
  employeeId?: string;
  status?: SalaryStatus;
  from?: string;
  to?: string;
}

/** POST /finance/salaries/compute body. */
export interface ComputeSalaryDto {
  teacherId: string;
  from: string;
  to: string;
  /** Also persist a PER_LESSON / PENDING Salary row. */
  persist?: boolean;
}

/** POST /finance/salaries/compute response. */
export interface SalaryComputation {
  teacherId: string;
  periodStart: string;
  periodEnd: string;
  basis: 'PER_LESSON';
  lessonsCount: number;
  amount: number;
  lessons: Array<{ lessonId: string; startsAt: string; payRate: number }>;
}

/** POST /finance/salaries body — exactly one of teacher/employee. */
export interface CreateSalaryDto {
  teacherId?: string;
  employeeId?: string;
  basis: SalaryBasis;
  periodStart: string;
  periodEnd: string;
  amount: number;
  status?: SalaryStatus;
}

/** PATCH /finance/salaries/:id body. */
export interface UpdateSalaryDto {
  amount?: number;
  status?: SalaryStatus;
}

/** PATCH /finance/salaries/:id/pay body (optional). */
export interface PaySalaryDto {
  paidAt?: string;
}
