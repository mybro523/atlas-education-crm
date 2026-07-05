/** Attendance status (shared with the attendance entity). */
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE';

/** A single grade (5-point scale, 2..5) (API_CONTRACT §9). */
export interface Grade {
  id: string;
  studentId: string;
  lessonId: string;
  value: number;
  comment?: string | null;
  authorId?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** PUT /journal/grades body — upsert on (studentId, lessonId). */
export interface UpsertGradeDto {
  studentId: string;
  lessonId: string;
  value: number;
  comment?: string;
}

/** One cell of the journal matrix. */
export interface JournalCell {
  grade?: number | null;
  attendance?: AttendanceStatus | null;
  remarks?: number;
}

/** A student row in the journal matrix. */
export interface JournalStudentRow {
  student: { id: string; firstName: string; lastName: string };
  cells: Record<string, JournalCell>;
}

/** GET /journal/groups/:groupId response (students × lessons matrix). */
export interface JournalMatrix {
  group: { id: string; name: string };
  lessons: Array<{
    id: string;
    startsAt: string;
    isConducted: boolean;
  }>;
  students: JournalStudentRow[];
}
