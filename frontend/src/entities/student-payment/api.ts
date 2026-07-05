import { axiosClient } from '@/shared/api';
import type { Paginated } from '@/shared/lib/query';
import type {
  StudentPayment,
  StudentPaymentListParams,
  RecordPaymentDto,
} from './model/types';

/**
 * Student subscription payments (FOUNDER + ADMIN). Separate from the monthly
 * billing under /finance/payments.
 */
export const studentPaymentApi = {
  async list(
    params?: StudentPaymentListParams,
  ): Promise<Paginated<StudentPayment>> {
    const { data } = await axiosClient.get<Paginated<StudentPayment>>(
      '/student-payments',
      { params },
    );
    return data;
  },

  /** POST /student-payments — records a PAID payment now for the student. */
  async record(dto: RecordPaymentDto): Promise<StudentPayment> {
    const { data } = await axiosClient.post<StudentPayment>(
      '/student-payments',
      dto,
    );
    return data;
  },
};
