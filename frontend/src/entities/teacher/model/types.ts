import type { PaginationParams } from '@/shared/lib/query';
import type { Branch } from '@/entities/branch';

/**
 * Teacher profile (API_CONTRACT §5). What a teacher teaches is expressed
 * through the groups they lead (each group carries a course) — there is no
 * subjects assignment.
 */
export interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
  middleName?: string | null;
  phone?: string | null;
  /** Subject / area the teacher specializes in (e.g. "English"). */
  specialty?: string | null;
  /** Free-form education level / qualification (e.g. "Bachelor"). */
  educationLevel?: string | null;
  /** Telegram handle (optional leading "@", 5–32 word chars). */
  telegramUsername?: string | null;
  /** Date of birth (ISO 8601 date string). */
  birthDate?: string | null;
  /** Date the teacher started at the academy (ISO 8601 date string). */
  hireDate?: string | null;
  branchId: string;
  userId?: string | null;
  createdAt: string;
  updatedAt: string;
  branch?: Branch;
}

export interface TeacherListParams extends PaginationParams {
  branchId?: string;
  search?: string;
}

export interface CreateTeacherDto {
  firstName: string;
  lastName: string;
  middleName?: string;
  phone?: string;
  /** Subject / area the teacher specializes in (≤ 120 chars). */
  specialty?: string;
  /** Free-form education level / qualification (≤ 120 chars). */
  educationLevel?: string;
  /** Telegram handle (optional leading "@", 5–32 word chars). */
  telegramUsername?: string;
  /** Date of birth (ISO 8601 date string). */
  birthDate?: string;
  /** Date the teacher started at the academy (ISO 8601 date string). */
  hireDate?: string;
  branchId: string;
  userId?: string;
}

/**
 * Update a teacher. `birthDate` / `hireDate` / `telegramUsername` accept `null`
 * (or empty string) to clear the stored value.
 */
export type UpdateTeacherDto = Partial<
  Omit<CreateTeacherDto, 'birthDate' | 'hireDate' | 'telegramUsername'>
> & {
  birthDate?: string | null;
  hireDate?: string | null;
  telegramUsername?: string | null;
};
