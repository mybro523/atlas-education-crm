import { axiosClient } from '@/shared/api';
import type {
  LessonRate,
  LessonRateListParams,
  CreateLessonRateDto,
  UpdateLessonRateDto,
} from './model/types';

/** Lesson rates (API_CONTRACT §14.2, FOUNDER only). Non-paginated: array. */
export const lessonRateApi = {
  async list(params?: LessonRateListParams): Promise<LessonRate[]> {
    const { data } = await axiosClient.get<LessonRate[]>(
      '/finance/lesson-rates',
      { params },
    );
    return data;
  },

  async getById(id: string): Promise<LessonRate> {
    const { data } = await axiosClient.get<LessonRate>(
      `/finance/lesson-rates/${id}`,
    );
    return data;
  },

  async create(dto: CreateLessonRateDto): Promise<LessonRate> {
    const { data } = await axiosClient.post<LessonRate>(
      '/finance/lesson-rates',
      dto,
    );
    return data;
  },

  async update(id: string, dto: UpdateLessonRateDto): Promise<LessonRate> {
    const { data } = await axiosClient.patch<LessonRate>(
      `/finance/lesson-rates/${id}`,
      dto,
    );
    return data;
  },

  async remove(id: string): Promise<void> {
    await axiosClient.delete(`/finance/lesson-rates/${id}`);
  },
};
