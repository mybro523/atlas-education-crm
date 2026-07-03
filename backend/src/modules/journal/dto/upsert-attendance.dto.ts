import { AttendanceStatus } from '@prisma/client';
import { IsEnum, IsString } from 'class-validator';

/**
 * Upsert attendance for a (student, lesson) pair.
 * Unique on Attendance.@@unique([studentId, lessonId]).
 */
export class UpsertAttendanceDto {
  @IsString()
  studentId!: string;

  @IsString()
  lessonId!: string;

  @IsEnum(AttendanceStatus)
  status!: AttendanceStatus;
}
