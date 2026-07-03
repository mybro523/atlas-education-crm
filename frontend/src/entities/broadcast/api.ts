import { axiosClient } from '@/shared/api';
import type { Paginated } from '@/shared/lib/query';
import type { Broadcast, BroadcastListParams, CreateBroadcastDto } from './model/types';

/**
 * SMS broadcasts (INTEGRATION API, roles ADMIN + FOUNDER). Paginated history,
 * enqueue-and-return-status on create, and single-record status polling.
 */
export const broadcastApi = {
  async list(params?: BroadcastListParams): Promise<Paginated<Broadcast>> {
    const { data } = await axiosClient.get<Paginated<Broadcast>>('/broadcasts', {
      params,
    });
    return data;
  },

  async getById(id: string): Promise<Broadcast> {
    const { data } = await axiosClient.get<Broadcast>(`/broadcasts/${id}`);
    return data;
  },

  async create(dto: CreateBroadcastDto): Promise<Broadcast> {
    const { data } = await axiosClient.post<Broadcast>('/broadcasts', dto);
    return data;
  },
};
