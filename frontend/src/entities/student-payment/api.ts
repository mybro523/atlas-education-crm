import { axiosClient } from '@/shared/api';
import type { Paginated } from '@/shared/lib/query';
import type {
  StudentPayment,
  StudentPaymentListParams,
  RecordPaymentDto,
  UpcomingPayment,
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

  /** GET /student-payments/upcoming — subscriptions ending within `days` days. */
  async upcoming(days?: number): Promise<UpcomingPayment[]> {
    const { data } = await axiosClient.get<UpcomingPayment[]>(
      '/student-payments/upcoming',
      { params: days != null ? { days } : undefined },
    );
    return data;
  },
};
