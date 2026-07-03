import { axiosClient } from '@/shared/api';
import type { Paginated } from '@/shared/lib/query';
import type {
  Lesson,
  LessonListParams,
  CreateLessonDto,
  UpdateLessonDto,
  ConductLessonDto,
} from './model/types';

/** Schedule / Lessons (API_CONTRACT §8). Paginated list. */
export const lessonApi = {
  async list(params?: LessonListParams): Promise<Paginated<Lesson>> {
    const { data } = await axiosClient.get<Paginated<Lesson>>('/lessons', {
      params,
    });
    return data;
  },

  async getById(id: string): Promise<Lesson> {
    const { data } = await axiosClient.get<Lesson>(`/lessons/${id}`);
    return data;
  },

  async create(dto: CreateLessonDto): Promise<Lesson> {
    const { data } = await axiosClient.post<Lesson>('/lessons', dto);
    return data;
  },

  async update(id: string, dto: UpdateLessonDto): Promise<Lesson> {
    const { data } = await axiosClient.patch<Lesson>(`/lessons/${id}`, dto);
    return data;
  },

  async remove(id: string): Promise<void> {
    await axiosClient.delete(`/lessons/${id}`);
  },

  /** PATCH /lessons/:id/conduct — mark conducted / not. */
  async conduct(id: string, dto: ConductLessonDto): Promise<Lesson> {
    const { data } = await axiosClient.patch<Lesson>(
      `/lessons/${id}/conduct`,
      dto,
    );
    return data;
  },
};
