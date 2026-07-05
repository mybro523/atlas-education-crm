import { axiosClient } from '@/shared/api';
import type { Paginated } from '@/shared/lib/query';
import type {
  Teacher,
  TeacherListParams,
  CreateTeacherDto,
  UpdateTeacherDto,
} from './model/types';

/** Teachers (API_CONTRACT §5). Paginated list. */
export const teacherApi = {
  async list(params?: TeacherListParams): Promise<Paginated<Teacher>> {
    const { data } = await axiosClient.get<Paginated<Teacher>>('/teachers', {
      params,
    });
    return data;
  },

  async getById(id: string): Promise<Teacher> {
    const { data } = await axiosClient.get<Teacher>(`/teachers/${id}`);
    return data;
  },

  async create(dto: CreateTeacherDto): Promise<Teacher> {
    const { data } = await axiosClient.post<Teacher>('/teachers', dto);
    return data;
  },

  async update(id: string, dto: UpdateTeacherDto): Promise<Teacher> {
    const { data } = await axiosClient.patch<Teacher>(`/teachers/${id}`, dto);
    return data;
  },

  async remove(id: string): Promise<void> {
    await axiosClient.delete(`/teachers/${id}`);
  },
};
