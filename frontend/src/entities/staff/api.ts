import { axiosClient } from '@/shared/api';
import type { CreateEmployeeDto, StaffUser } from './model/types';

/** Staff account management (FOUNDER; reads also ADMIN). Route: /users. */
export const staffApi = {
  async list(): Promise<StaffUser[]> {
    const { data } = await axiosClient.get<StaffUser[]>('/users/staff');
    return data;
  },

  async create(dto: CreateEmployeeDto): Promise<StaffUser> {
    const { data } = await axiosClient.post<StaffUser>('/users', dto);
    return data;
  },

  async resetPassword(id: string, password: string): Promise<{ ok: boolean }> {
    const { data } = await axiosClient.patch<{ ok: boolean }>(
      `/users/${id}/password`,
      { password },
    );
    return data;
  },

  async setBlocked(
    id: string,
    blocked: boolean,
  ): Promise<{ id: string; isActive: boolean }> {
    const { data } = await axiosClient.patch<{ id: string; isActive: boolean }>(
      `/users/${id}/block`,
      { blocked },
    );
    return data;
  },

  async remove(id: string): Promise<{ id: string }> {
    const { data } = await axiosClient.delete<{ id: string }>(`/users/${id}`);
    return data;
  },
};
