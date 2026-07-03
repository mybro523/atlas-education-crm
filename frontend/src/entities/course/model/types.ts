import type { PaginationParams } from '@/shared/lib/query';
import type { Branch } from '@/entities/branch';
import type { Subject } from '@/entities/subject';
import type { CourseType } from '@/entities/course-type';

/** Course — a program offered at a branch, priced per month (API_CONTRACT §4). */
export interface Course {
  id: string;
  name: string;
  courseTypeId: string;
  subjectId: string;
  branchId: string;
  pricePerMonth: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  /** Populated on detail GET. */
  courseType?: CourseType;
  subject?: Subject;
  branch?: Branch;
}

/** GET /courses filters. */
export interface CourseListParams extends PaginationParams {
  branchId?: string;
  courseTypeId?: string;
  subjectId?: string;
  active?: boolean;
  search?: string;
}

export interface CreateCourseDto {
  name: string;
  courseTypeId: string;
  subjectId: string;
  branchId: string;
  pricePerMonth: number;
  isActive?: boolean;
}

export type UpdateCourseDto = Partial<CreateCourseDto>;
