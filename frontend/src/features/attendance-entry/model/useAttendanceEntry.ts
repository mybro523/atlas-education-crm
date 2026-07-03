import { useCallback } from 'react';

import { useUpsertAttendance, type AttendanceStatus } from '@/entities/attendance';

/**
 * Attendance entry for a journal cell (API_CONTRACT §9). Upserts a
 * PRESENT / ABSENT / LATE mark on the (studentId, lessonId) pair, reflected
 * instantly in the shared journal matrix cache.
 */
export function useAttendanceEntry(groupId: string | undefined) {
  const upsert = useUpsertAttendance(groupId);

  const setAttendance = useCallback(
    (
      studentId: string,
      lessonId: string,
      status: AttendanceStatus,
      options?: { onSuccess?: () => void; onError?: () => void },
    ) => {
      upsert.mutate(
        { studentId, lessonId, status },
        { onSuccess: options?.onSuccess, onError: options?.onError },
      );
    },
    [upsert],
  );

  return { setAttendance, isSaving: upsert.isPending };
}
