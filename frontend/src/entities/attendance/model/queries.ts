import { useOptimisticMutation } from '@/shared/lib/query';
import {
  journalKeys,
  patchMatrixCell,
  type JournalMatrix,
} from '@/entities/grade';
import { attendanceApi } from '../api';
import type { Attendance, UpsertAttendanceDto } from './types';

/**
 * Upsert attendance (PUT /journal/attendance). Reflected in the shared journal
 * matrix cache so the journal grid updates instantly.
 */
export function useUpsertAttendance(groupId?: string) {
  return useOptimisticMutation<Attendance, UpsertAttendanceDto>({
    mutationFn: (dto) => attendanceApi.upsert(dto),
    keysToCancel: () => (groupId ? [journalKeys.matrix(groupId)] : []),
    keysToInvalidate: () => (groupId ? [journalKeys.matrix(groupId)] : []),
    optimisticUpdate: (dto, qc) => {
      if (!groupId) return;
      qc.setQueryData<JournalMatrix>(journalKeys.matrix(groupId), (old) =>
        patchMatrixCell(old, dto.studentId, dto.lessonId, {
          attendance: dto.status,
        }),
      );
    },
  });
}
