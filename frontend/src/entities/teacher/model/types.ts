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
  branchId: string;
  userId?: string;
}

export type UpdateTeacherDto = Partial<CreateTeacherDto>;
