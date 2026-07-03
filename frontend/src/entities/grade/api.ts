import { axiosClient } from '@/shared/api';
import type { Grade, UpsertGradeDto, JournalMatrix } from './model/types';

/**
 * Grades live under the Journal module (API_CONTRACT §9). Grades are upserted
 * on the (studentId, lessonId) unique pair; the journal matrix is the read view.
 */
export const gradeApi = {
  /** GET /journal/groups/:groupId — students × lessons matrix. */
  async matrix(groupId: string): Promise<JournalMatrix> {
    const { data } = await axiosClient.get<JournalMatrix>(
      `/journal/groups/${groupId}`,
    );
    return data;
  },

  /** PUT /journal/grades — upsert a grade. */
  async upsert(dto: UpsertGradeDto): Promise<Grade> {
    const { data } = await axiosClient.put<Grade>('/journal/grades', dto);
    return data;
  },

  /** DELETE /journal/grades/:studentId/:lessonId — remove a grade. */
  async remove(studentId: string, lessonId: string): Promise<void> {
    await axiosClient.delete(`/journal/grades/${studentId}/${lessonId}`);
  },
};
