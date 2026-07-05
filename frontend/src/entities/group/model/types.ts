import type { PaginationParams } from '@/shared/lib/query';
import type { Branch } from '@/entities/branch';
import type { Course } from '@/entities/course';
import type { Teacher } from '@/entities/teacher';

/** Learning group — a cohort tied to a course and teacher (§7). */
export interface Group {
  id: string;
  name: string;
  courseId: string;
  teacherId?: string | null;
  branchId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  /** Populated on detail GET. */
  course?: Course;
  teacher?: Teacher;
  branch?: Branch;
  /** Convenience counts on detail. */
  studentsCount?: number;
  lessonsCount?: number;
}

/** GroupStudent membership row (`GET /groups/:id/students`). */
export interface GroupStudent {
  id: string;
  groupId: string;
  studentId: string;
  joinedAt: string;
  leftAt?: string | null;
  student?: {
    id: string;
    firstName: string;
    lastName: string;
    phone?: string | null;
  };
}

export interface GroupListParams extends PaginationParams {
  branchId?: string;
  courseId?: string;
  teacherId?: string;
  search?: string;
}

export interface GroupStudentsParams {
  /** Include soft-left members (`leftAt != null`). Default false. */
  includeLeft?: boolean;
}

/**
 * A student in the "addable" pool for a group (`GET /groups/:id/available-students`).
 * Lightweight projection — NOT the full Student entity — and intentionally
 * cross-branch (any student may join any group).
 */
export interface AvailableStudent {
  id: string;
  firstName: string;
  lastName: string;
  middleName?: string | null;
  phone?: string | null;
  branchId: string;
}

export interface GroupAvailableStudentsParams extends PaginationParams {
  /** Matches student firstName / lastName / phone (contains, case-insensitive). */
  search?: string;
}

export interface CreateGroupDto {
  name: string;
  courseId: string;
  teacherId?: string;
  branchId: string;
  isActive?: boolean;
}

export type UpdateGroupDto = Partial<CreateGroupDto>;

/** POST /groups/:id/students body. */
export interface AddGroupStudentDto {
  studentId: string;
}
