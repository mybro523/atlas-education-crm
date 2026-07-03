import type { PaginationParams } from '@/shared/lib/query';
import type { Branch } from '@/entities/branch';
import type { Subject } from '@/entities/subject';

/** Teacher profile (API_CONTRACT §5). */
export interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
  middleName?: string | null;
  phone?: string | null;
  branchId: string;
  userId?: string | null;
  createdAt: string;
  updatedAt: string;
  /** Flattened from TeacherSubject on detail. */
  subjects?: Subject[];
  branch?: Branch;
}

export interface TeacherListParams extends PaginationParams {
  branchId?: string;
  subjectId?: string;
  search?: string;
}

export interface CreateTeacherDto {
  firstName: string;
  lastName: string;
  middleName?: string;
  phone?: string;
  branchId: string;
  /** Initial subjects; later changes go through the subjects endpoint. */
  subjectIds?: string[];
  userId?: string;
}

/** UpdateTeacherDto excludes `subjectIds` (use the subjects endpoint). */
export type UpdateTeacherDto = Partial<Omit<CreateTeacherDto, 'subjectIds'>>;

/** PUT /teachers/:id/subjects body — replaces the full subject set. */
export interface SetTeacherSubjectsDto {
  subjectIds: string[];
}
