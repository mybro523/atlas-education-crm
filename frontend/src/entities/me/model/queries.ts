import { useQuery } from '@tanstack/react-query';

import { useSessionStore } from '@/entities/session';
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

// Self endpoints are role-scoped on the backend (student-self = STUDENT,
// teacher-self = TEACHER). Gate each query by role so a FOUNDER/ADMIN viewing a
// shared screen never fires a teacher/student-only request (which would 403).
const useIsStudent = () => useSessionStore((s) => s.user?.role === 'STUDENT');
const useIsTeacher = () => useSessionStore((s) => s.user?.role === 'TEACHER');

// --- Student self ---

export function useMyStudentProfile() {
  const enabled = useIsStudent();
  return useQuery({
    queryKey: meKeys.student.profile(),
    queryFn: () => meApi.student.profile(),
    enabled,
  });
}

export function useMyGrades(params?: MyGradesParams) {
  const enabled = useIsStudent();
  return useQuery({
    queryKey: meKeys.student.grades(params),
    queryFn: () => meApi.student.grades(params),
    enabled,
  });
}

export function useMyStudentSchedule(params?: DateRangeParams) {
  const enabled = useIsStudent();
  return useQuery({
    queryKey: meKeys.student.schedule(params),
    queryFn: () => meApi.student.schedule(params),
    enabled,
  });
}

export function useMyPerformance() {
  const enabled = useIsStudent();
  return useQuery({
    queryKey: meKeys.student.performance(),
    queryFn: () => meApi.student.performance(),
    enabled,
  });
}

// --- Teacher self ---

export function useMyTeacherGroups() {
  const enabled = useIsTeacher();
  return useQuery({
    queryKey: meKeys.teacher.groups(),
    queryFn: () => meApi.teacher.groups(),
    enabled,
  });
}

export function useMyTeacherStudents(params?: MyTeacherStudentsParams) {
  const enabled = useIsTeacher();
  return useQuery({
    queryKey: meKeys.teacher.students(params),
    queryFn: () => meApi.teacher.students(params),
    enabled,
  });
}

export function useMyTeacherSchedule(params?: DateRangeParams) {
  const enabled = useIsTeacher();
  return useQuery({
    queryKey: meKeys.teacher.schedule(params),
    queryFn: () => meApi.teacher.schedule(params),
    enabled,
  });
}
