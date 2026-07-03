import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import {
  useCreateRemark,
  useDeleteRemark,
  useRemarks,
  type Remark,
} from '@/entities/remark';
import { journalKeys, patchMatrixCell, type JournalMatrix } from '@/entities/grade';

/**
 * Remark entry for a journal cell (API_CONTRACT §9). A remark is a free-text
 * note about a student, optionally tied to a lesson.
 *
 * On top of the entity's optimistic remark-list cache update, this bumps the
 * matching journal-matrix cell's `remarks` count so the grid badge updates
 * instantly (the matrix and the remark list are separate caches).
 */
export function useRemarkEntry(
  groupId: string | undefined,
  studentId: string | undefined,
  lessonId: string | undefined,
) {
  const qc = useQueryClient();
  const create = useCreateRemark();
  const remove = useDeleteRemark();

  // Remarks scoped to this exact cell (student + lesson).
  const list = useRemarks(
    studentId && lessonId ? { studentId, lessonId } : undefined,
  );

  const bumpMatrixRemarks = useCallback(
    (delta: number) => {
      if (!groupId || !studentId || !lessonId) return;
      qc.setQueryData<JournalMatrix>(journalKeys.matrix(groupId), (old) => {
        if (!old) return old;
        const row = old.students.find((s) => s.student.id === studentId);
        const current = row?.cells[lessonId]?.remarks ?? 0;
        return patchMatrixCell(old, studentId, lessonId, {
          remarks: Math.max(0, current + delta),
        });
      });
    },
    [qc, groupId, studentId, lessonId],
  );

  const addRemark = useCallback(
    (text: string, options?: { onSuccess?: () => void; onError?: () => void }) => {
      if (!studentId || !lessonId || !text.trim()) return;
      create.mutate(
        { studentId, lessonId, text: text.trim() },
        {
          onSuccess: () => {
            bumpMatrixRemarks(1);
            options?.onSuccess?.();
          },
          onError: options?.onError,
        },
      );
    },
    [create, studentId, lessonId, bumpMatrixRemarks],
  );

  const removeRemark = useCallback(
    (id: string, options?: { onSuccess?: () => void; onError?: () => void }) => {
      remove.mutate(id, {
        onSuccess: () => {
          bumpMatrixRemarks(-1);
          options?.onSuccess?.();
        },
        onError: options?.onError,
      });
    },
    [remove, bumpMatrixRemarks],
  );

  const remarks: Remark[] = list.data ?? [];

  return {
    remarks,
    isLoading: list.isLoading,
    isError: list.isError,
    addRemark,
    removeRemark,
    isSaving: create.isPending || remove.isPending,
  };
}
