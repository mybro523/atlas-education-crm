import { axiosClient } from '@/shared/api';
import type { Branch, CreateBranchDto, UpdateBranchDto } from './model/types';

/** Branches dictionary (API_CONTRACT §1). Non-paginated: plain array. */
export const branchApi = {
  async list(): Promise<Branch[]> {
    const { data } = await axiosClient.get<Branch[]>('/branches');
    return data;
  },

  async getById(id: string): Promise<Branch> {
    const { data } = await axiosClient.get<Branch>(`/branches/${id}`);
    return data;
  },

  async create(dto: CreateBranchDto): Promise<Branch> {
    const { data } = await axiosClient.post<Branch>('/branches', dto);
    return data;
  },

  async update(id: string, dto: UpdateBranchDto): Promise<Branch> {
    const { data } = await axiosClient.patch<Branch>(`/branches/${id}`, dto);
    return data;
  },

  async remove(id: string): Promise<void> {
    await axiosClient.delete(`/branches/${id}`);
  },
};
