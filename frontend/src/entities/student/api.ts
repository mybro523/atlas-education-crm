import { axiosClient } from '@/shared/api';
import type { Paginated } from '@/shared/lib/query';
import type {
  Student,
  StudentListParams,
  CreateStudentDto,
  UpdateStudentDto,
  Parent,
  CreateParentDto,
  UpdateParentDto,
} from './model/types';

/** Students + nested parents (API_CONTRACT §6). Paginated list. */
export const studentApi = {
  async list(params?: StudentListParams): Promise<Paginated<Student>> {
    const { data } = await axiosClient.get<Paginated<Student>>('/students', {
      params,
    });
    return data;
  },

  async getById(id: string): Promise<Student> {
    const { data } = await axiosClient.get<Student>(`/students/${id}`);
    return data;
  },

  async create(dto: CreateStudentDto): Promise<Student> {
    const { data } = await axiosClient.post<Student>('/students', dto);
    return data;
  },

  async update(id: string, dto: UpdateStudentDto): Promise<Student> {
    const { data } = await axiosClient.patch<Student>(`/students/${id}`, dto);
    return data;
  },

  async remove(id: string): Promise<void> {
    await axiosClient.delete(`/students/${id}`);
  },

  // --- Nested parents ---

  async listParents(studentId: string): Promise<Parent[]> {
    const { data } = await axiosClient.get<Parent[]>(
      `/students/${studentId}/parents`,
    );
    return data;
  },

  async addParent(studentId: string, dto: CreateParentDto): Promise<Parent> {
    const { data } = await axiosClient.post<Parent>(
      `/students/${studentId}/parents`,
      dto,
    );
    return data;
  },

  async updateParent(
    studentId: string,
    parentId: string,
    dto: UpdateParentDto,
  ): Promise<Parent> {
    const { data } = await axiosClient.patch<Parent>(
      `/students/${studentId}/parents/${parentId}`,
      dto,
    );
    return data;
  },

  async removeParent(studentId: string, parentId: string): Promise<void> {
    await axiosClient.delete(`/students/${studentId}/parents/${parentId}`);
  },
};
