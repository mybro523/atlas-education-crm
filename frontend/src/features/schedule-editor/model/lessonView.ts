import type { Lesson } from '@/entities/lesson';
import type { Course } from '@/entities/course';
import type { Group } from '@/entities/group';
import type { Teacher } from '@/entities/teacher';
import type { Room } from '@/entities/room';
import { toTimeInput } from './datetime';

/**
 * Id → entity lookups used to label a lesson. They let the grid render the
 * course / teacher / room of an OPTIMISTIC lesson (which only carries scalar
 * ids, no populated relations) until the server response reconciles.
 */
export interface LessonLookups {
  coursesById: Map<string, Course>;
  groupsById: Map<string, Group>;
  teachersById: Map<string, Teacher>;
  roomsById: Map<string, Room>;
}

/** Presentational projection of a lesson for the schedule grid. */
export interface LessonView {
  courseName: string;
  groupName: string | null;
  teacherName: string | null;
  roomName: string | null;
  startTime: string;
  endTime: string | null;
  /** `09:00–10:30` or just `09:00` when there is no end time. */
  timeLabel: string;
}

function teacherLabel(
  t: { firstName: string; lastName: string } | null | undefined,
): string | null {
  if (!t) return null;
  return `${t.lastName} ${t.firstName}`.trim();
}

/**
 * Resolve a lesson's display fields, preferring populated relations from the
 * API and falling back to the id lookups (for freshly-created optimistic rows).
 */
export function resolveLessonView(
  lesson: Lesson,
  lookups: LessonLookups,
): LessonView {
  // Prefer the API-populated relation, but only when its id still matches the
  // lesson's scalar FK — after an optimistic edit the merged patch updates the
  // id without the relation, so fall back to the id lookups in that case.
  const populatedGroup =
    lesson.group && lesson.group.id === lesson.groupId ? lesson.group : undefined;
  const group =
    populatedGroup ?? lookups.groupsById.get(lesson.groupId) ?? null;
  const course =
    populatedGroup?.course ??
    (group ? lookups.coursesById.get(group.courseId) : undefined) ??
    null;

  const populatedTeacher =
    lesson.teacher && lesson.teacher.id === lesson.teacherId
      ? lesson.teacher
      : undefined;
  const teacher =
    populatedTeacher ??
    (lesson.teacherId ? lookups.teachersById.get(lesson.teacherId) : undefined) ??
    null;

  const populatedRoom =
    lesson.room && lesson.room.id === lesson.roomId ? lesson.room : undefined;
  const room =
    populatedRoom ??
    (lesson.roomId ? lookups.roomsById.get(lesson.roomId) : undefined) ??
    null;

  const startTime = toTimeInput(new Date(lesson.startsAt));
  const endTime = lesson.endsAt ? toTimeInput(new Date(lesson.endsAt)) : null;

  return {
    courseName: course?.name ?? group?.name ?? '—',
    groupName: group?.name ?? null,
    teacherName: teacherLabel(teacher),
    roomName: room?.name ?? null,
    startTime,
    endTime,
    timeLabel: endTime ? `${startTime}–${endTime}` : startTime,
  };
}
