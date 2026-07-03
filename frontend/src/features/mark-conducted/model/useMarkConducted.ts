import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useConductLesson } from '@/entities/lesson';
import { journalKeys, type JournalMatrix } from '@/entities/grade';

/**
 * Mark a lesson conducted / not (API_CONTRACT §8 PATCH /lessons/:id/conduct).
 *
 * `useConductLesson` already patches the lessons-list/detail caches
 * optimistically. When invoked from the journal, the same `isConducted` flag
 * lives on the journal-matrix lesson columns (a separate cache), so we also
 * patch that column and invalidate the matrix so the header updates instantly.
 */
export function useMarkConducted(groupId?: string) {
  const qc = useQueryClient();
  const conduct = useConductLesson();

  const setConducted = useCallback(
    (
      lessonId: string,
      isConducted: boolean,
      options?: { onSuccess?: () => void; onError?: () => void },
    ) => {
      // Optimistically patch the journal matrix lesson column.
      if (groupId) {
        qc.setQueryData<JournalMatrix>(journalKeys.matrix(groupId), (old) =>
          old
            ? {
                ...old,
                lessons: old.lessons.map((l) =>
                  l.id === lessonId ? { ...l, isConducted } : l,
                ),
              }
            : old,
        );
      }

      conduct.mutate(
        { id: lessonId, dto: { isConducted } },
        {
          onSuccess: () => {
            if (groupId) {
              void qc.invalidateQueries({
                queryKey: journalKeys.matrix(groupId),
              });
            }
            options?.onSuccess?.();
          },
          onError: () => {
            if (groupId) {
              void qc.invalidateQueries({
                queryKey: journalKeys.matrix(groupId),
              });
            }
            options?.onError?.();
          },
        },
      );
    },
    [conduct, qc, groupId],
  );

  return { setConducted, isSaving: conduct.isPending };
}
