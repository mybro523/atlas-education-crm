import { axiosClient } from '@/shared/api';
import type { Remark, RemarkListParams, CreateRemarkDto } from './model/types';

/** Remarks under the Journal module (API_CONTRACT §9). */
export const remarkApi = {
  /** GET /journal/remarks?studentId&lessonId&groupId */
  async list(params?: RemarkListParams): Promise<Remark[]> {
    const { data } = await axiosClient.get<Remark[]>('/journal/remarks', {
      params,
    });
    return data;
  },

  /** POST /journal/remarks — create a remark. */
  async create(dto: CreateRemarkDto): Promise<Remark> {
    const { data } = await axiosClient.post<Remark>('/journal/remarks', dto);
    return data;
  },

  /** DELETE /journal/remarks/:id */
  async remove(id: string): Promise<void> {
    await axiosClient.delete(`/journal/remarks/${id}`);
  },
};
