import type { PaginationParams } from '@/shared/lib/query';
import type { Group } from '@/entities/group';
import type { Teacher } from '@/entities/teacher';

/** A rate row used as a lesson pay fallback (see lesson-rate entity). */
export interface LessonRateRef {
  id: string;
  name?: string | null;
  amount: number;
}

/** Scheduled lesson (API_CONTRACT §8). */
export interface Lesson {
  id: string;
  groupId: string;
  teacherId?: string | null;
  startsAt: string;
  endsAt?: string | null;
  topic?: string | null;
  room?: string | null;
  teacherPayRate?: number | null;
  lessonRateId?: string | null;
  isConducted: boolean;
  createdAt: string;
  updatedAt: string;
  /** Populated on detail GET. */
  group?: Group;
  teacher?: Teacher;
  lessonRate?: LessonRateRef;
}

/** GET /lessons filters (date range on `startsAt`). */
export interface LessonListParams extends PaginationParams {
  groupId?: string;
  teacherId?: string;
  from?: string;
  to?: string;
}

export interface CreateLessonDto {
  groupId: string;
  teacherId?: string;
  startsAt: string;
  endsAt?: string;
  topic?: string;
  room?: string;
  teacherPayRate?: number;
  lessonRateId?: string;
  isConducted?: boolean;
}

export type UpdateLessonDto = Partial<CreateLessonDto>;

/** PATCH /lessons/:id/conduct body. */
export interface ConductLessonDto {
  isConducted: boolean;
}
