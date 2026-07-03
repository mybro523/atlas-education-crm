import { useQuery } from '@tanstack/react-query';

import { useOptimisticMutation } from '@/shared/lib/query';
import { gradeApi } from '../api';
import type { Grade, UpsertGradeDto, JournalMatrix } from './types';

/**
 * Journal query keys — shared by grade, attendance and remark slices since they
 * all mutate the same `GET /journal/groups/:groupId` matrix.
 */
export const journalKeys = {
  all: ['journal'] as const,
  matrices: () => [...journalKeys.all, 'matrix'] as const,
  matrix: (groupId: string) => [...journalKeys.matrices(), groupId] as const,
};

export const gradeKeys = journalKeys;

export function useJournalMatrix(groupId: string | undefined) {
  return useQuery({
    queryKey: journalKeys.matrix(groupId ?? ''),
    queryFn: () => gradeApi.matrix(groupId as string),
    enabled: Boolean(groupId),
  });
}

/**
 * Patch a single (studentId, lessonId) cell of every cached journal matrix.
 * Used by grade/attendance/remark optimistic updates.
 */
function patchMatrixCell(
  matrix: JournalMatrix | undefined,
  studentId: string,
  lessonId: string,
  patch: Partial<JournalMatrix['students'][number]['cells'][string]>,
): JournalMatrix | undefined {
  if (!matrix) return matrix;
  return {
    ...matrix,
    students: matrix.students.map((row) =>
      row.student.id === studentId
        ? {
            ...row,
            cells: {
              ...row.cells,
              [lessonId]: { ...row.cells[lessonId], ...patch },
            },
          }
        : row,
    ),
  };
}

export { patchMatrixCell };

/** Upsert a grade (PUT /journal/grades) — reflected instantly in the matrix. */
export function useUpsertGrade(groupId?: string) {
  return useOptimisticMutation<Grade, UpsertGradeDto>({
    mutationFn: (dto) => gradeApi.upsert(dto),
    keysToCancel: () => (groupId ? [journalKeys.matrix(groupId)] : []),
    keysToInvalidate: () => (groupId ? [journalKeys.matrix(groupId)] : []),
    optimisticUpdate: (dto, qc) => {
      if (!groupId) return;
      qc.setQueryData<JournalMatrix>(journalKeys.matrix(groupId), (old) =>
        patchMatrixCell(old, dto.studentId, dto.lessonId, {
          grade: dto.value,
        }),
      );
    },
  });
}

/** Remove a grade (DELETE /journal/grades/:studentId/:lessonId). */
export function useDeleteGrade(groupId?: string) {
  return useOptimisticMutation<
    void,
    { studentId: string; lessonId: string }
  >({
    mutationFn: ({ studentId, lessonId }) =>
      gradeApi.remove(studentId, lessonId),
    keysToCancel: () => (groupId ? [journalKeys.matrix(groupId)] : []),
    keysToInvalidate: () => (groupId ? [journalKeys.matrix(groupId)] : []),
    optimisticUpdate: ({ studentId, lessonId }, qc) => {
      if (!groupId) return;
      qc.setQueryData<JournalMatrix>(journalKeys.matrix(groupId), (old) =>
        patchMatrixCell(old, studentId, lessonId, { grade: null }),
      );
    },
  });
}
