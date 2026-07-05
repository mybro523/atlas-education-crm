import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { lessonApi, lessonKeys, type Lesson } from '@/entities/lesson';

/**
 * Filters for the schedule range fetch. The visible view (month/week/day)
 * resolves to a `[from, to)` window; optional room/teacher/course narrow it.
 */
export interface ScheduleLessonsFilters {
  from: string;
  to: string;
  roomId?: string;
  teacherId?: string;
  courseId?: string;
}

// The list endpoint caps `pageSize` at 100, but a full month can hold more
// lessons than that. Page through until every row in the window is collected.
const PAGE_SIZE = 100;
const MAX_PAGES = 30; // safety valve (≤ 3000 lessons)

async function fetchAllLessons(
  filters: ScheduleLessonsFilters,
): Promise<Lesson[]> {
  const all: Lesson[] = [];
  let page = 1;
  let pageCount = 1;

  do {
    const res = await lessonApi.list({ ...filters, page, pageSize: PAGE_SIZE });
    all.push(...res.items);
    pageCount = res.meta.pageCount;
    page += 1;
  } while (page <= pageCount && page <= MAX_PAGES);

  return all;
}

/**
 * All lessons in a date window (paged through transparently). The key nests
 * under `lessonKeys.lists()` so the entity's optimistic create/update/delete
 * mutations patch this cache too, and `invalidateQueries(lessonKeys.lists())`
 * refetches it. `keepPreviousData` keeps the grid stable while navigating.
 */
export function useScheduleLessons(filters: ScheduleLessonsFilters) {
  return useQuery({
    queryKey: [...lessonKeys.lists(), 'range', filters] as const,
    queryFn: () => fetchAllLessons(filters),
    placeholderData: keepPreviousData,
  });
}
