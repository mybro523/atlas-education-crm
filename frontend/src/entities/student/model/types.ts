import type { PaginationParams } from '@/shared/lib/query';
import type { Branch } from '@/entities/branch';

/** Which parent/guardian slot a Parent occupies (API_CONTRACT §6). */
export type ParentRelation = 'FATHER' | 'MOTHER' | 'OTHER';

/** Learning level of a student (backend enum StudentLevel). */
export type StudentLevel = 'BEGINNER' | 'STANDARD' | 'ADVANCED';

/** How the student found the academy (backend enum ReferralSource). */
export type ReferralSource =
  | 'INSTAGRAM'
  | 'FRIENDS'
  | 'ADS'
  | 'SELF'
  | 'OTHER';

/** Lightweight course projection embedded on the student detail/list payload. */
export interface StudentCourseRef {
  id: string;
  name: string;
  /** Monthly price of the course (TJS) — used to derive what a student owes. */
  pricePerMonth?: number | null;
}

/**
 * Parent / guardian. `position` (должность) and `workplace` both participate in
 * student search (spec §4.4). `relation` marks the parent as FATHER / MOTHER /
 * OTHER (defaults to OTHER server-side).
 */
export interface Parent {
  id: string;
  studentId: string;
  firstName: string;
  lastName: string;
  phone: string;
  relation: ParentRelation;
  position?: string | null;
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
  /** Course the student is enrolled in (nullable). */
  courseId?: string | null;
  /** Learning level (beginner / standard / advanced). */
  level?: StudentLevel | null;
  /** How the student found the academy. */
  referralSource?: ReferralSource | null;
  /** Sum the student must pay for the course (TJS). */
  courseFee?: number | null;
  /** Subscription (абонемент) figures computed server-side (TJS). */
  paidAmount?: number;
  dueAmount?: number;
  owedAmount?: number;
  /** Billing anchor (period counts from here). */
  enrollmentDate: string;
  isActive: boolean;
  userId?: string | null;
  createdAt: string;
  updatedAt: string;
  parents?: Parent[];
  branch?: Branch;
  /** Populated on detail/list GET (id + name). */
  course?: StudentCourseRef | null;
  groupLinks?: StudentGroupLink[];
}

export interface StudentListParams extends PaginationParams {
  branchId?: string;
  groupId?: string;
  /**
   * Matches student firstName OR lastName OR any parent workplace OR any parent
   * position/должность (contract §6, spec §4.4).
   */
  search?: string;
}

/**
 * An explicit father / mother slot on the student form. The FATHER / MOTHER
 * relation is implied by which slot the object is sent in, so it is not part of
 * this shape.
 */
export interface ParentFigureDto {
  firstName: string;
  lastName: string;
  phone: string;
  workplace?: string;
  position?: string;
}

export interface CreateParentDto {
  firstName: string;
  lastName: string;
  phone: string;
  /** Defaults to OTHER server-side when omitted. */
  relation?: ParentRelation;
  position?: string;
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
  /** Course the student is enrolled in — references an existing Course. */
  courseId?: string | null;
  /** Learning level (beginner / standard / advanced). */
  level?: StudentLevel | null;
  /** How the student found the academy. */
  referralSource?: ReferralSource | null;
  /** Sum the student must pay for the course (TJS, ≥ 0, 2 decimals). */
  courseFee?: number | null;
  /** Defaults to now server-side; billing anchor. */
  enrollmentDate?: string;
  isActive?: boolean;
  userId?: string;
  /** Explicit FATHER slot (upserted with the FATHER relation). */
  father?: ParentFigureDto;
  /** Explicit MOTHER slot (upserted with the MOTHER relation). */
  mother?: ParentFigureDto;
  /** Generic parents[] (each carrying its own relation, default OTHER). */
  parents?: CreateParentDto[];
}

/**
 * UpdateStudentDto excludes nested `parents[]` (OTHER parents are managed via
 * the parent sub-routes) but keeps the explicit `father` / `mother` slots.
 */
export type UpdateStudentDto = Partial<Omit<CreateStudentDto, 'parents'>>;
