import type { Lesson } from '@/entities/lesson';

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

/**
 * Room accent color of a lesson (`#RRGGBB` or null). Uses the populated
 * `lesson.room` relation only while its id still matches the scalar FK —
 * after an optimistic edit the merged patch may leave a stale relation.
 */
export function lessonRoomColor(lesson: Lesson): string | null {
  const room =
    lesson.room && lesson.room.id === lesson.roomId ? lesson.room : null;
  const color = room?.color ?? null;
  return color && HEX_COLOR.test(color) ? color : null;
}

/** Inline accent styles (left border + ~10% tint) for a room color. */
export function roomAccentStyle(
  color: string | null,
): { borderLeftColor: string; backgroundColor: string } | undefined {
  if (!color) return undefined;
  return { borderLeftColor: color, backgroundColor: `${color}1A` };
}
