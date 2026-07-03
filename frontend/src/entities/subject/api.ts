import { axiosClient } from '@/shared/api';
import type { Subject, CreateSubjectDto, UpdateSubjectDto } from './model/types';

/** Subjects dictionary (API_CONTRACT §2). Non-paginated: plain array. */
export const subjectApi = {
  async list(): Promise<Subject[]> {
    const { data } = await axiosClient.get<Subject[]>('/subjects');
    return data;
  },

  async getById(id: string): Promise<Subject> {
    const { data } = await axiosClient.get<Subject>(`/subjects/${id}`);
    return data;
  },

  async create(dto: CreateSubjectDto): Promise<Subject> {
    const { data } = await axiosClient.post<Subject>('/subjects', dto);
    return data;
  },

  async update(id: string, dto: UpdateSubjectDto): Promise<Subject> {
    const { data } = await axiosClient.patch<Subject>(`/subjects/${id}`, dto);
    return data;
  },

  async remove(id: string): Promise<void> {
    await axiosClient.delete(`/subjects/${id}`);
  },
};
