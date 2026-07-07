/** Roles the founder can hand out from the Employees screen. */
export type StaffRole = 'FOUNDER' | 'ADMIN' | 'SALES_MANAGER' | 'TEACHER';

/** A staff account row (GET /users/staff). */
export interface StaffUser {
  id: string;
  email: string | null;
  phone: string | null;
  role: StaffRole;
  language: string;
  branchId: string | null;
  isActive: boolean;
  createdAt: string;
  fullName: string;
  position: string | null;
  branch?: { id: string; name: string } | null;
  teacherProfile?: { id: string; firstName: string; lastName: string } | null;
  employee?: { id: string; firstName: string; lastName: string } | null;
}

/** POST /users — create a staff account with login + password. */
export interface CreateEmployeeDto {
  email: string;
  /** Min 4 chars. */
  password: string;
  role: Exclude<StaffRole, 'FOUNDER'>;
  firstName: string;
  lastName: string;
  position?: string;
  branchId?: string;
}
