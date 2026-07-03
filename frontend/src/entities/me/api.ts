import { axiosClient } from '@/shared/api';
import type {
  MyStudentProfile,
  MyGradesParams,
  MyGrade,
  DateRangeParams,
  MyScheduleLesson,
  MyPerformance,
  MyTeacherGroup,
  MyTeacherStudentsParams,
  MyTeacherStudent,
} from './model/types';

/** Self endpoints (API_CONTRACT §10 student, §11 teacher). All read-only. */
export const meApi = {
  // --- Student self (§10) ---
  student: {
    async profile(): Promise<MyStudentProfile> {
      const { data } = await axiosClient.get<MyStudentProfile>(
        '/me/student/profile',
      );
      return data;
    },
    async grades(params?: MyGradesParams): Promise<MyGrade[]> {
      const { data } = await axiosClient.get<MyGrade[]>('/me/student/grades', {
        params,
      });
      return data;
    },
    async schedule(params?: DateRangeParams): Promise<MyScheduleLesson[]> {
      const { data } = await axiosClient.get<MyScheduleLesson[]>(
        '/me/student/schedule',
        { params },
      );
      return data;
    },
    async performance(): Promise<MyPerformance> {
      const { data } = await axiosClient.get<MyPerformance>(
        '/me/student/performance',
      );
      return data;
    },
  },

  // --- Teacher self (§11) ---
  teacher: {
    async groups(): Promise<MyTeacherGroup[]> {
      const { data } = await axiosClient.get<MyTeacherGroup[]>(
        '/me/teacher/groups',
      );
      return data;
    },
    async students(
      params?: MyTeacherStudentsParams,
    ): Promise<MyTeacherStudent[]> {
      const { data } = await axiosClient.get<MyTeacherStudent[]>(
        '/me/teacher/students',
        { params },
      );
      return data;
    },
    async schedule(params?: DateRangeParams): Promise<MyScheduleLesson[]> {
      const { data } = await axiosClient.get<MyScheduleLesson[]>(
        '/me/teacher/schedule',
        { params },
      );
      return data;
    },
  },
};
