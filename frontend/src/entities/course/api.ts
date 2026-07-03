import { axiosClient } from '@/shared/api';
import type { Paginated } from '@/shared/lib/query';
import type {
  Course,
  CourseListParams,
  CreateCourseDto,
  UpdateCourseDto,
} from './model/types';

/** Courses (API_CONTRACT §4). Paginated list. */
export const courseApi = {
  async list(params?: CourseListParams): Promise<Paginated<Course>> {
    const { data } = await axiosClient.get<Paginated<Course>>('/courses', {
      params,
    });
    return data;
  },

  async getById(id: string): Promise<Course> {
    const { data } = await axiosClient.get<Course>(`/courses/${id}`);
    return data;
  },

  async create(dto: CreateCourseDto): Promise<Course> {
    const { data } = await axiosClient.post<Course>('/courses', dto);
    return data;
  },

  async update(id: string, dto: UpdateCourseDto): Promise<Course> {
    const { data } = await axiosClient.patch<Course>(`/courses/${id}`, dto);
    return data;
  },

  async remove(id: string): Promise<void> {
    await axiosClient.delete(`/courses/${id}`);
  },
};
