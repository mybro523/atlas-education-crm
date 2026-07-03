/**
 * RBAC roles — MUST stay identical to the backend Role enum.
 * Exactly these 5 values.
 */
export const ROLES = {
  FOUNDER: 'FOUNDER',
  ADMIN: 'ADMIN',
  SALES_MANAGER: 'SALES_MANAGER',
  TEACHER: 'TEACHER',
  STUDENT: 'STUDENT',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ALL_ROLES: Role[] = [
  ROLES.FOUNDER,
  ROLES.ADMIN,
  ROLES.SALES_MANAGER,
  ROLES.TEACHER,
  ROLES.STUDENT,
];

/** i18n key for a role's display label (see common.json → roles.*). */
export function roleLabelKey(role: Role): string {
  return `roles.${role}`;
}
