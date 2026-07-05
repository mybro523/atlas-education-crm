import type { PaginationParams } from '@/shared/lib/query';
import type { Branch } from '@/entities/branch';
import type { CourseType } from '@/entities/course-type';

/** Course — a program offered at a branch, priced per month (API_CONTRACT §4). */
export interface Course {
  id: string;
  name: string;
  courseTypeId: string;
  branchId: string;
  pricePerMonth: number;
  /** Term dates (ISO 8601) — the course runs e.g. 2026-07-01..2026-08-01. */
  startDate?: string | null;
  endDate?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  /** Populated on detail GET. */
  courseType?: CourseType;
  branch?: Branch;
}

/** GET /courses filters. */
export interface CourseListParams extends PaginationParams {
  branchId?: string;
  courseTypeId?: string;
  active?: boolean;
  search?: string;
}

export interface CreateCourseDto {
  name: string;
  courseTypeId: string;
  branchId: string;
  pricePerMonth: number;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
}

export type UpdateCourseDto = Partial<CreateCourseDto>;
