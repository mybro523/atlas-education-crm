import { axiosClient } from '@/shared/api';
import type { Paginated } from '@/shared/lib/query';
import type {
  FinanceRecord,
  FinanceRecordListParams,
  CreateFinanceRecordDto,
  UpdateFinanceRecordDto,
} from './model/types';

/** Finance records (API_CONTRACT §13, FOUNDER only). Paginated list. */
export const financeRecordApi = {
  async list(
    params?: FinanceRecordListParams,
  ): Promise<Paginated<FinanceRecord>> {
    const { data } = await axiosClient.get<Paginated<FinanceRecord>>(
      '/finance/records',
      { params },
    );
    return data;
  },

  async getById(id: string): Promise<FinanceRecord> {
    const { data } = await axiosClient.get<FinanceRecord>(
      `/finance/records/${id}`,
    );
    return data;
  },

  async create(dto: CreateFinanceRecordDto): Promise<FinanceRecord> {
    const { data } = await axiosClient.post<FinanceRecord>(
      '/finance/records',
      dto,
    );
    return data;
  },

  async update(
    id: string,
    dto: UpdateFinanceRecordDto,
  ): Promise<FinanceRecord> {
    const { data } = await axiosClient.patch<FinanceRecord>(
      `/finance/records/${id}`,
      dto,
    );
    return data;
  },

  async remove(id: string): Promise<void> {
    await axiosClient.delete(`/finance/records/${id}`);
  },
};
