/** Teacher/admin remark about a student (API_CONTRACT §9). */
export interface Remark {
  id: string;
  studentId: string;
  lessonId?: string | null;
  text: string;
  authorId?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** GET /journal/remarks filters. */
export interface RemarkListParams {
  studentId?: string;
  lessonId?: string;
  groupId?: string;
}

/** POST /journal/remarks body. */
export interface CreateRemarkDto {
  studentId: string;
  lessonId?: string;
  text: string;
}
