import { axiosClient } from '@/shared/api';
import type {
  CourseType,
  CourseTypeListParams,
  CreateCourseTypeDto,
  UpdateCourseTypeDto,
} from './model/types';

/** CourseTypes dictionary (API_CONTRACT §3). Non-paginated: plain array. */
export const courseTypeApi = {
  async list(params?: CourseTypeListParams): Promise<CourseType[]> {
    const { data } = await axiosClient.get<CourseType[]>('/course-types', {
      params,
    });
    return data;
  },

  async getById(id: string): Promise<CourseType> {
    const { data } = await axiosClient.get<CourseType>(`/course-types/${id}`);
    return data;
  },

  async create(dto: CreateCourseTypeDto): Promise<CourseType> {
    const { data } = await axiosClient.post<CourseType>('/course-types', dto);
    return data;
  },

  async update(id: string, dto: UpdateCourseTypeDto): Promise<CourseType> {
    const { data } = await axiosClient.patch<CourseType>(
      `/course-types/${id}`,
      dto,
    );
    return data;
  },

  async remove(id: string): Promise<void> {
    await axiosClient.delete(`/course-types/${id}`);
  },
};
