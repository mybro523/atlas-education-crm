/** Lesson pay rate (API_CONTRACT §14.2, FOUNDER only). */
export interface LessonRate {
  id: string;
  groupId?: string | null;
  name?: string | null;
  amount: number;
  createdAt: string;
  updatedAt: string;
}

/** GET /finance/lesson-rates?groupId= */
export interface LessonRateListParams {
  groupId?: string;
}

export interface CreateLessonRateDto {
  /** Scoped to a group, or global when omitted. */
  groupId?: string;
  name?: string;
  amount: number;
}

export type UpdateLessonRateDto = Partial<CreateLessonRateDto>;
