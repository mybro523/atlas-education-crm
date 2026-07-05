import type { PaginationParams } from '@/shared/lib/query';
import type { Group } from '@/entities/group';
import type { Teacher } from '@/entities/teacher';
import type { Room } from '@/entities/room';

/** A rate row used as a lesson pay fallback (see lesson-rate entity). */
export interface LessonRateRef {
  id: string;
  name?: string | null;
  amount: number;
}

/**
 * Scheduled lesson (API_CONTRACT §8). The lesson's academic label comes from
 * its group's course (`group.course`); there is no free-text topic. The room is
 * a FK to the Room dictionary (`roomId` / populated `room`).
 */
export interface Lesson {
  id: string;
  groupId: string;
  teacherId?: string | null;
  roomId?: string | null;
  startsAt: string;
  endsAt?: string | null;
  teacherPayRate?: number | null;
  lessonRateId?: string | null;
  isConducted: boolean;
  createdAt: string;
  updatedAt: string;
  /** Populated on list/detail GET. `group.course` labels the lesson. */
  group?: Group;
  teacher?: Teacher;
  room?: Room | null;
  lessonRate?: LessonRateRef;
}

/** GET /lessons filters (date range on `startsAt`). */
export interface LessonListParams extends PaginationParams {
  groupId?: string;
  teacherId?: string;
  /** Filters via the lesson's group → course. */
  courseId?: string;
  roomId?: string;
  from?: string;
  to?: string;
}

export interface CreateLessonDto {
  groupId: string;
  teacherId?: string;
  startsAt: string;
  endsAt?: string;
  roomId?: string;
  teacherPayRate?: number;
  lessonRateId?: string;
  isConducted?: boolean;
}

export type UpdateLessonDto = Partial<CreateLessonDto>;

/** PATCH /lessons/:id/conduct body. */
export interface ConductLessonDto {
  isConducted: boolean;
}

// ---------------------------------------------------------------------------
// Room occupancy (GET /schedule/rooms/occupancy)
// ---------------------------------------------------------------------------

/**
 * Query for the room-occupancy view. Provide a single `date` (whole calendar
 * day) OR an explicit `from`/`to` range (range wins if both are sent).
 */
export interface RoomOccupancyParams {
  date?: string;
  from?: string;
  to?: string;
  branchId?: string;
}

/** A lesson overlapping the occupancy window (lightweight projection). */
export interface OccupancyLesson {
  id: string;
  roomId: string | null;
  startsAt: string;
  endsAt?: string | null;
  isConducted: boolean;
  group: {
    id: string;
    name: string;
    course: { id: string; name: string };
  };
  teacher?: { id: string; firstName: string; lastName: string } | null;
}

/** Per-room free/occupied entry. */
export interface RoomOccupancyItem {
  room: {
    id: string;
    name: string;
    branchId: string | null;
    isActive: boolean;
  };
  occupied: boolean;
  lessons: OccupancyLesson[];
}

/** Response of GET /schedule/rooms/occupancy. */
export interface RoomOccupancy {
  window: { from: string; to: string };
  items: RoomOccupancyItem[];
}
