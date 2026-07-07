import { axiosClient } from '@/shared/api';
import type { Paginated } from '@/shared/lib/query';
import type {
  Salary,
  SalaryListParams,
  SalaryOverviewRow,
  ComputeSalaryDto,
  SalaryComputation,
  CreateSalaryDto,
  UpdateSalaryDto,
  PaySalaryDto,
} from './model/types';

/** Salaries (API_CONTRACT §14.1, FOUNDER only). Paginated list. */
export const salaryApi = {
  async list(params?: SalaryListParams): Promise<Paginated<Salary>> {
    const { data } = await axiosClient.get<Paginated<Salary>>(
      '/finance/salaries',
      { params },
    );
    return data;
  },

  async getById(id: string): Promise<Salary> {
    const { data } = await axiosClient.get<Salary>(`/finance/salaries/${id}`);
    return data;
  },

  /** GET /finance/salaries/overview — automatic per-period salary for ALL staff. */
  async overview(from: string, to: string): Promise<SalaryOverviewRow[]> {
    const { data } = await axiosClient.get<SalaryOverviewRow[]>(
      '/finance/salaries/overview',
      { params: { from, to } },
    );
    return data;
  },

  /** POST /finance/salaries/compute — compute (optionally persist). */
  async compute(dto: ComputeSalaryDto): Promise<SalaryComputation> {
    const { data } = await axiosClient.post<SalaryComputation>(
      '/finance/salaries/compute',
      dto,
    );
    return data;
  },

  async create(dto: CreateSalaryDto): Promise<Salary> {
    const { data } = await axiosClient.post<Salary>('/finance/salaries', dto);
    return data;
  },

  /** PATCH /finance/salaries/:id/pay — mark PAID. */
  async pay(id: string, dto?: PaySalaryDto): Promise<Salary> {
    const { data } = await axiosClient.patch<Salary>(
      `/finance/salaries/${id}/pay`,
      dto ?? {},
    );
    return data;
  },

  async update(id: string, dto: UpdateSalaryDto): Promise<Salary> {
    const { data } = await axiosClient.patch<Salary>(
      `/finance/salaries/${id}`,
      dto,
    );
    return data;
  },

  async remove(id: string): Promise<void> {
    await axiosClient.delete(`/finance/salaries/${id}`);
  },
};
