import type { AttendanceStatus } from '@/entities/grade';

/** Colour treatment for a grade chip (2 = red … 5 = green). */
export function gradeChipClass(value: number): string {
  if (value >= 5) return 'bg-success/15 text-success';
  if (value === 4) return 'bg-brand-100 text-brand-700 dark:bg-brand-600/20 dark:text-brand-300';
  if (value === 3) return 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300';
  return 'bg-danger/15 text-danger';
}

/** Ring/background treatment for a cell based on attendance status. */
export function attendanceCellClass(
  status: AttendanceStatus | null | undefined,
): string {
  switch (status) {
    case 'ABSENT':
      return 'bg-danger/5';
    case 'LATE':
      return 'bg-amber-100/40 dark:bg-amber-500/10';
    case 'PRESENT':
      return 'bg-success/5';
    default:
      return '';
  }
}

/** Short one-letter marker for an attendance status (localized by caller). */
export function attendanceMarkKey(status: AttendanceStatus): string {
  return `journal.attendanceShort.${status}`;
}
