import { useQuery } from '@tanstack/react-query';

import { meApi } from '../api';
import type {
  MyGradesParams,
  DateRangeParams,
  MyTeacherStudentsParams,
} from './types';

export const meKeys = {
  all: ['me'] as const,
  student: {
    all: ['me', 'student'] as const,
    profile: () => ['me', 'student', 'profile'] as const,
    grades: (params?: MyGradesParams) =>
      ['me', 'student', 'grades', params ?? {}] as const,
    schedule: (params?: DateRangeParams) =>
      ['me', 'student', 'schedule', params ?? {}] as const,
    performance: () => ['me', 'student', 'performance'] as const,
  },
  teacher: {
    all: ['me', 'teacher'] as const,
    groups: () => ['me', 'teacher', 'groups'] as const,
    students: (params?: MyTeacherStudentsParams) =>
      ['me', 'teacher', 'students', params ?? {}] as const,
    schedule: (params?: DateRangeParams) =>
      ['me', 'teacher', 'schedule', params ?? {}] as const,
  },
};

// --- Student self ---

export function useMyStudentProfile() {
  return useQuery({
    queryKey: meKeys.student.profile(),
    queryFn: () => meApi.student.profile(),
  });
}

export function useMyGrades(params?: MyGradesParams) {
  return useQuery({
    queryKey: meKeys.student.grades(params),
    queryFn: () => meApi.student.grades(params),
  });
}

export function useMyStudentSchedule(params?: DateRangeParams) {
  return useQuery({
    queryKey: meKeys.student.schedule(params),
    queryFn: () => meApi.student.schedule(params),
  });
}

export function useMyPerformance() {
  return useQuery({
    queryKey: meKeys.student.performance(),
    queryFn: () => meApi.student.performance(),
  });
}

// --- Teacher self ---

export function useMyTeacherGroups() {
  return useQuery({
    queryKey: meKeys.teacher.groups(),
    queryFn: () => meApi.teacher.groups(),
  });
}

export function useMyTeacherStudents(params?: MyTeacherStudentsParams) {
  return useQuery({
    queryKey: meKeys.teacher.students(params),
    queryFn: () => meApi.teacher.students(params),
  });
}

export function useMyTeacherSchedule(params?: DateRangeParams) {
  return useQuery({
    queryKey: meKeys.teacher.schedule(params),
    queryFn: () => meApi.teacher.schedule(params),
  });
}
