import { useMemo } from 'react';

import { ROLES } from '@/shared/config';
import { useSessionStore, selectRole } from '@/entities/session';
import { useGroups } from '@/entities/group';
import { useMyTeacherGroups } from '@/entities/me';

export interface JournalGroupOption {
  id: string;
  name: string;
}

/**
 * The groups the current user may open a journal for:
 * - TEACHER → only their own groups (`/me/teacher/groups`).
 * - ADMIN / FOUNDER → all groups.
 * - others → none (RBAC: journal is TEACHER + ADMIN + FOUNDER).
 */
export function useJournalGroups(): {
  groups: JournalGroupOption[];
  isLoading: boolean;
} {
  const role = useSessionStore(selectRole);
  const isTeacher = role === ROLES.TEACHER;
  const isPrivileged = role === ROLES.ADMIN || role === ROLES.FOUNDER;

  const teacherGroups = useMyTeacherGroups();
  const allGroups = useGroups(
    isPrivileged ? { pageSize: 100 } : undefined,
  );

  return useMemo(() => {
    if (isTeacher) {
      return {
        groups: (teacherGroups.data ?? []).map((g) => ({
          id: g.id,
          name: g.name,
        })),
        isLoading: teacherGroups.isLoading,
      };
    }
    if (isPrivileged) {
      return {
        groups: (allGroups.data?.items ?? []).map((g) => ({
          id: g.id,
          name: g.name,
        })),
        isLoading: allGroups.isLoading,
      };
    }
    return { groups: [], isLoading: false };
  }, [isTeacher, isPrivileged, teacherGroups, allGroups]);
}
