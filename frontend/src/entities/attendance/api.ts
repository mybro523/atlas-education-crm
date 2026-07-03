import { axiosClient } from '@/shared/api';
import type { Attendance, UpsertAttendanceDto } from './model/types';

/** Attendance lives under the Journal module (API_CONTRACT §9). */
export const attendanceApi = {
  /** PUT /journal/attendance — upsert an attendance mark. */
  async upsert(dto: UpsertAttendanceDto): Promise<Attendance> {
    const { data } = await axiosClient.put<Attendance>(
      '/journal/attendance',
      dto,
    );
    return data;
  },
};
