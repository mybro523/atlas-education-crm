/** Self endpoints (API_CONTRACT §10 student, §11 teacher). Read-only. */

// --- Common query params ---
export interface DateRangeParams {
  from?: string;
  to?: string;
}

// ============ Student self (§10) ============

export interface MyStudentProfile {
  id: string;
  firstName: string;
  lastName: string;
  middleName?: string | null;
  birthDate?: string | null;
  phone?: string | null;
  branchId: string;
  enrollmentDate: string;
  isActive: boolean;
  parents: Array<{
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    workplace?: string | null;
  }>;
  groups: Array<{ id: string; name: string }>;
}

export interface MyGradesParams extends DateRangeParams {
  subjectId?: string;
}

export interface MyGrade {
  id: string;
  value: number;
  comment?: string | null;
  createdAt: string;
  lesson: {
    id: string;
    startsAt: string;
    topic?: string | null;
    group: {
      id: string;
      name: string;
      subject: { id: string; name: string };
    };
  };
}

export interface MyScheduleLesson {
  id: string;
  startsAt: string;
  endsAt?: string | null;
  room?: string | null;
  topic?: string | null;
  isConducted: boolean;
  group: { id: string; name: string };
  subject: { id: string; name: string };
  teacher?: { id: string; firstName: string; lastName: string } | null;
}

export interface MyPerformance {
  bySubject: Array<{
    subjectId: string;
    subjectName: string;
    averageGrade: number;
    gradesCount: number;
    absences: number;
    lates: number;
    present: number;
  }>;
  overall: { averageGrade: number; totalAbsences: number };
}

// ============ Teacher self (§11) ============

export interface MyTeacherGroup {
  id: string;
  name: string;
  subject?: { id: string; name: string };
  course?: { id: string; name: string };
  studentsCount?: number;
  lessonsCount?: number;
}

export interface MyTeacherStudentsParams {
  groupId?: string;
  search?: string;
}

export interface MyTeacherStudent {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  parents?: Array<{ firstName: string; lastName: string; phone: string }>;
  groups?: Array<{ id: string; name: string }>;
}
