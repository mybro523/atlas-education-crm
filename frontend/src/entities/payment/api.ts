import { axiosClient } from '@/shared/api';
import type { Paginated } from '@/shared/lib/query';
import type {
  Payment,
  PaymentListParams,
  GeneratePaymentDto,
  PayPaymentDto,
  UpdatePaymentDto,
  DebtsParams,
  DebtsReport,
} from './model/types';

/** Payments (API_CONTRACT §12, FOUNDER only). Paginated list. */
export const paymentApi = {
  async list(params?: PaymentListParams): Promise<Paginated<Payment>> {
    const { data } = await axiosClient.get<Paginated<Payment>>('/payments', {
      params,
    });
    return data;
  },

  async getById(id: string): Promise<Payment> {
    const { data } = await axiosClient.get<Payment>(`/payments/${id}`);
    return data;
  },

  /** POST /payments/generate — upsert current-period payment(s). */
  async generate(dto: GeneratePaymentDto): Promise<Payment[]> {
    const { data } = await axiosClient.post<Payment[]>(
      '/payments/generate',
      dto,
    );
    return data;
  },

  /** PATCH /payments/:id/pay — mark PAID. */
  async pay(id: string, dto?: PayPaymentDto): Promise<Payment> {
    const { data } = await axiosClient.patch<Payment>(
      `/payments/${id}/pay`,
      dto ?? {},
    );
    return data;
  },

  async update(id: string, dto: UpdatePaymentDto): Promise<Payment> {
    const { data } = await axiosClient.patch<Payment>(`/payments/${id}`, dto);
    return data;
  },

  async remove(id: string): Promise<void> {
    await axiosClient.delete(`/payments/${id}`);
  },

  /** GET /payments/debts — unpaid elapsed periods report. */
  async debts(params?: DebtsParams): Promise<DebtsReport> {
    const { data } = await axiosClient.get<DebtsReport>('/payments/debts', {
      params,
    });
    return data;
  },
};
