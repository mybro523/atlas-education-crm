import type { AttendanceStatus } from '@/entities/grade';

export type { AttendanceStatus };

/** Attendance mark (API_CONTRACT §9). Upsert on (studentId, lessonId). */
export interface Attendance {
  id: string;
  studentId: string;
  lessonId: string;
  status: AttendanceStatus;
  createdAt: string;
  updatedAt: string;
}

/** PUT /journal/attendance body. */
export interface UpsertAttendanceDto {
  studentId: string;
  lessonId: string;
  status: AttendanceStatus;
}
