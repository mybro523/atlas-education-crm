import { useMemo } from 'react';

import { ROLES } from '@/shared/config';
import { useSessionStore, selectRole } from '@/entities/session';
import { useMyTeacherGroups } from '@/entities/me';

/**
 * Whether the current user may add/remove students (and, for schedule, conduct
 * lessons) for the given group.
 *
 * - ADMIN and FOUNDER may manage any group.
 * - A TEACHER may manage only groups they own. Ownership is resolved from
 *   `/me/teacher/groups` (the User payload has no teacherId), so the query is
 *   only fired for teachers.
 * - Everyone else: no.
 */
export function useCanManageGroup(groupId: string | undefined): boolean {
  const role = useSessionStore(selectRole);
  const isPrivileged = role === ROLES.ADMIN || role === ROLES.FOUNDER;
  const isTeacher = role === ROLES.TEACHER;

  const { data: myGroups } = useMyTeacherGroups();

  return useMemo(() => {
    if (isPrivileged) return true;
    if (!isTeacher || !groupId) return false;
    return Boolean(myGroups?.some((g) => g.id === groupId));
  }, [isPrivileged, isTeacher, groupId, myGroups]);
}

/**
 * Whether the current user may perform full CRUD on groups/lessons
 * (create/edit/delete). Restricted to ADMIN + FOUNDER per the contract.
 */
export function useCanCrudGroups(): boolean {
  const role = useSessionStore(selectRole);
  return role === ROLES.ADMIN || role === ROLES.FOUNDER;
}

/**
 * A predicate `(groupId) => boolean` describing which groups the current user
 * may manage (add/remove students, conduct lessons). Handy in list/grid views
 * where per-row hooks aren't possible.
 *
 * - ADMIN/FOUNDER → always true.
 * - TEACHER → true only for their own groups (from `/me/teacher/groups`).
 * - Others → always false.
 */
export function useManageableGroupPredicate(): (groupId?: string | null) => boolean {
  const role = useSessionStore(selectRole);
  const isPrivileged = role === ROLES.ADMIN || role === ROLES.FOUNDER;
  const isTeacher = role === ROLES.TEACHER;
  const { data: myGroups } = useMyTeacherGroups();

  return useMemo(() => {
    const ownIds = new Set((myGroups ?? []).map((g) => g.id));
    return (groupId?: string | null) => {
      if (isPrivileged) return true;
      if (!isTeacher || !groupId) return false;
      return ownIds.has(groupId);
    };
  }, [isPrivileged, isTeacher, myGroups]);
}
