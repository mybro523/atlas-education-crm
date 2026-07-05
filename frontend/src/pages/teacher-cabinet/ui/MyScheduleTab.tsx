import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
} from 'lucide-react';

import { cn } from '@/shared/lib/cn';
import { Button, Spinner, EmptyState, Badge } from '@/shared/ui';
import { useMyTeacherSchedule, type MyScheduleLesson } from '@/entities/me';
import {
  buildWeek,
  addWeeks,
  isSameDay,
  WEEKDAY_KEYS,
} from '@/features/schedule-editor';

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Compact tile for one of the teacher's own lessons. */
function ScheduleLessonCard({ lesson }: { lesson: MyScheduleLesson }) {
  const { t } = useTranslation();
  const start = timeLabel(lesson.startsAt);
  const end = lesson.endsAt ? timeLabel(lesson.endsAt) : null;

  return (
    <div
      className={cn(
        'rounded-xl border p-2.5 text-left',
        lesson.isConducted
          ? 'border-success/30 bg-success/5'
          : 'border-border bg-surface-muted/40',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1 text-xs font-medium text-foreground">
          <Clock className="h-3.5 w-3.5 text-foreground-muted" aria-hidden />
          <span>
            {start}
            {end ? `–${end}` : ''}
          </span>
        </div>
        <Badge
          variant={lesson.isConducted ? 'success' : 'muted'}
          className="shrink-0"
        >
          {lesson.isConducted
            ? t('teacherCabinet.conducted')
            : t('teacherCabinet.notConducted')}
        </Badge>
      </div>

      <p className="mt-1.5 truncate text-sm font-medium text-foreground">
        {lesson.group?.name ?? '—'}
      </p>
      {lesson.group?.course?.name && (
        <p className="truncate text-xs text-foreground-muted">
          {lesson.group.course.name}
        </p>
      )}
      {lesson.room?.name && (
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-foreground-muted">
          <span className="flex items-center gap-0.5">
            <MapPin className="h-3 w-3" aria-hidden />
            {lesson.room.name}
          </span>
        </div>
      )}
    </div>
  );
}

/** "My schedule" — a Monday-first week view of the teacher's own lessons. */
export function MyScheduleTab() {
  const { t } = useTranslation();
  const [ref, setRef] = useState(() => new Date());
  const week = useMemo(() => buildWeek(ref), [ref]);

  const { data, isLoading, isError } = useMyTeacherSchedule({
    from: week.fromIso,
    to: week.toIso,
  });

  const lessons = useMemo(() => data ?? [], [data]);

  const lessonsByDay = useMemo(() => {
    const buckets: MyScheduleLesson[][] = [[], [], [], [], [], [], []];
    for (const lesson of lessons) {
      const start = new Date(lesson.startsAt);
      const idx = week.days.findIndex((d) => isSameDay(d, start));
      if (idx >= 0) buckets[idx].push(lesson);
    }
    for (const bucket of buckets) {
      bucket.sort(
        (a, b) =>
          new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
      );
    }
    return buckets;
  }, [lessons, week]);

  const weekLabel = week.days[0].toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
  });

  return (
    <div>
      {/* Week navigation */}
      <div className="mb-4 flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={t('teacherCabinet.prevWeek')}
          onClick={() => setRef((r) => addWeeks(r, -1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setRef(new Date())}
        >
          {t('teacherCabinet.today')}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={t('teacherCabinet.nextWeek')}
          onClick={() => setRef((r) => addWeeks(r, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <span className="ml-1 text-sm font-medium text-foreground">
          {t('teacherCabinet.weekOf', { date: weekLabel })}
        </span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner />
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-border bg-surface">
          <EmptyState
            title={t('teacherCabinet.loadError')}
            icon={<CalendarDays className="h-6 w-6" aria-hidden />}
          />
        </div>
      ) : lessons.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface">
          <EmptyState
            title={t('teacherCabinet.noLessons')}
            description={t('teacherCabinet.noLessonsHint')}
            icon={<CalendarDays className="h-6 w-6" aria-hidden />}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {week.days.map((day, idx) => {
            const dayLessons = lessonsByDay[idx];
            const isToday = isSameDay(day, new Date());
            return (
              <div
                key={day.toISOString()}
                className="rounded-2xl border border-border bg-surface p-2.5"
              >
                <div className="mb-2 flex items-center justify-between px-0.5">
                  <span
                    className={cn(
                      'text-sm font-semibold capitalize',
                      isToday ? 'text-primary' : 'text-foreground',
                    )}
                  >
                    {t(`teacherCabinet.weekdays.${WEEKDAY_KEYS[idx]}`)}
                  </span>
                  <span className="text-xs text-foreground-muted">
                    {day.toLocaleDateString(undefined, {
                      day: '2-digit',
                      month: '2-digit',
                    })}
                  </span>
                </div>
                {dayLessons.length === 0 ? (
                  <p className="px-0.5 py-3 text-center text-xs text-foreground-muted">
                    {t('teacherCabinet.dayEmpty')}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {dayLessons.map((lesson) => (
                      <ScheduleLessonCard key={lesson.id} lesson={lesson} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
