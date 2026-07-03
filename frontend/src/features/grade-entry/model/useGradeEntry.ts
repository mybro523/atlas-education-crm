import { useCallback } from 'react';

import { useUpsertGrade, useDeleteGrade } from '@/entities/grade';

/**
 * Grade entry for a journal cell (API_CONTRACT §9). Wraps the optimistic
 * grade upsert/delete hooks so the JournalMatrix stays a thin caller:
 *
 * - `setGrade(studentId, lessonId, value, comment?)` upserts a 2..5 grade.
 * - `clearGrade(studentId, lessonId)` removes it.
 *
 * Both reflect instantly in the shared journal matrix cache.
 */
export function useGradeEntry(groupId: string | undefined) {
  const upsert = useUpsertGrade(groupId);
  const remove = useDeleteGrade(groupId);

  const setGrade = useCallback(
    (
      studentId: string,
      lessonId: string,
      value: number,
      comment?: string,
      options?: { onSuccess?: () => void; onError?: () => void },
    ) => {
      upsert.mutate(
        { studentId, lessonId, value, comment: comment?.trim() || undefined },
        { onSuccess: options?.onSuccess, onError: options?.onError },
      );
    },
    [upsert],
  );

  const clearGrade = useCallback(
    (
      studentId: string,
      lessonId: string,
      options?: { onSuccess?: () => void; onError?: () => void },
    ) => {
      remove.mutate(
        { studentId, lessonId },
        { onSuccess: options?.onSuccess, onError: options?.onError },
      );
    },
    [remove],
  );

  return {
    setGrade,
    clearGrade,
    isSaving: upsert.isPending || remove.isPending,
  };
}
