import type { PaginationParams } from '@/shared/lib/query';
import type { Branch } from '@/entities/branch';

/** Cabinet login credentials issued to a teacher/student. */
export interface CabinetCredentials {
  email: string;
  /** Min 4 chars (backend-enforced). */
  password: string;
}

/** Linked cabinet account summary (safe fields only). */
export interface LinkedUserSummary {
  id: string;
  email: string | null;
  isActive: boolean;
}

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
  /** Education level code (NONE / SECONDARY / HIGHER) or a legacy value. */
  educationLevel?: string | null;
  /** Telegram handle (optional leading "@", 5–32 word chars). */
  telegramUsername?: string | null;
  /** Date of birth (ISO 8601 date string). */
  birthDate?: string | null;
  /** Date the teacher started at the academy (ISO 8601 date string). */
  hireDate?: string | null;
  /** Hourly pay rate (TJS/hour) — basis for automatic salary computation. */
  hourlyRate?: number | string | null;
  branchId: string;
  userId?: string | null;
  createdAt: string;
  updatedAt: string;
  branch?: Branch;
  /** Linked cabinet account (login) — present on list/detail responses. */
  user?: LinkedUserSummary | null;
  /** Groups the teacher leads (detail include). */
  groups?: { id: string; name: string; course?: { id: string; name: string } }[];
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
  /** Education level code (NONE / SECONDARY / HIGHER). */
  educationLevel?: string;
  /** Telegram handle (optional leading "@", 5–32 word chars). */
  telegramUsername?: string;
  /** Date of birth (ISO 8601 date string). */
  birthDate?: string;
  /** Date the teacher started at the academy (ISO 8601 date string). */
  hireDate?: string;
  /** Hourly pay rate (TJS/hour). */
  hourlyRate?: number;
  branchId: string;
  userId?: string;
  /** Cabinet login issued to the teacher. */
  credentials?: CabinetCredentials;
}

/**
 * Update a teacher. `birthDate` / `hireDate` / `telegramUsername` /
 * `hourlyRate` accept `null` (or empty string) to clear the stored value.
 * `credentials` issues or refreshes the cabinet login.
 */
export type UpdateTeacherDto = Partial<
  Omit<
    CreateTeacherDto,
    'birthDate' | 'hireDate' | 'telegramUsername' | 'hourlyRate'
  >
> & {
  birthDate?: string | null;
  hireDate?: string | null;
  telegramUsername?: string | null;
  hourlyRate?: number | null;
  credentials?: CabinetCredentials;
};
