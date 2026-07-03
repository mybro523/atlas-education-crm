import type { AttendanceStatus } from '@/entities/attendance';

/** Attendance statuses in display order (API_CONTRACT §9). */
export const ATTENDANCE_STATUSES: AttendanceStatus[] = [
  'PRESENT',
  'LATE',
  'ABSENT',
];

/** i18n key for a status label (journal.attendance.<status>). */
export function attendanceLabelKey(status: AttendanceStatus): string {
  return `journal.attendance.${status}`;
}
