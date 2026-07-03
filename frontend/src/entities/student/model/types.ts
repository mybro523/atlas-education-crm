import type { PaginationParams } from '@/shared/lib/query';
import type { Branch } from '@/entities/branch';

/** Parent — searchable by workplace (API_CONTRACT §6). */
export interface Parent {
  id: string;
  studentId: string;
  firstName: string;
  lastName: string;
  phone: string;
  workplace?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/** Link of a student to a group (GroupStudent). */
export interface StudentGroupLink {
  id: string;
  groupId: string;
  studentId: string;
  joinedAt: string;
  leftAt?: string | null;
  group?: { id: string; name: string };
}

/** Student profile. `enrollmentDate` anchors the monthly billing cycle. */
export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  middleName?: string | null;
  birthDate?: string | null;
  phone?: string | null;
  branchId: string;
  /** Billing anchor (period counts from here). */
  enrollmentDate: string;
  isActive: boolean;
  userId?: string | null;
  createdAt: string;
  updatedAt: string;
  parents?: Parent[];
  branch?: Branch;
  groupLinks?: StudentGroupLink[];
}

export interface StudentListParams extends PaginationParams {
  branchId?: string;
  groupId?: string;
  /** Matches firstName OR lastName OR any parent.workplace (contract §6). */
  search?: string;
}

export interface CreateParentDto {
  firstName: string;
  lastName: string;
  phone: string;
  workplace?: string;
}

export type UpdateParentDto = Partial<CreateParentDto>;

export interface CreateStudentDto {
  firstName: string;
  lastName: string;
  middleName?: string;
  birthDate?: string;
  phone?: string;
  branchId: string;
  /** Defaults to now server-side; billing anchor. */
  enrollmentDate?: string;
  isActive?: boolean;
  userId?: string;
  parents?: CreateParentDto[];
}

/** UpdateStudentDto excludes nested `parents` (manage via parent sub-routes). */
export type UpdateStudentDto = Partial<Omit<CreateStudentDto, 'parents'>>;
