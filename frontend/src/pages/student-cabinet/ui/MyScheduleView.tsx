import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  User,
} from 'lucide-react';

import { cn } from '@/shared/lib/cn';
import { Button, Card, EmptyState, Spinner } from '@/shared/ui';
import { useMyStudentSchedule, type MyScheduleLesson } from '@/entities/me';
import {
  buildWeek,
  addWeeks,
  isSameDay,
  WEEKDAY_KEYS,
} from '@/features/schedule-editor';
import { formatTimeRange } from '@/features/view-performance';

/**
 * "My schedule" — the student's weekly lesson grid (subject, time, room,
 * teacher). Week navigation drives the `from`/`to` query. Desktop shows a
 * 7-column track; mobile stacks the days (flawless from 320px).
 */
export function MyScheduleView() {
  const { t } = useTranslation();
  const [ref, setRef] = useState(() => new Date());
  const week = useMemo(() => buildWeek(ref), [ref]);
  const today = new Date();

  const { data, isLoading, isError } = useMyStudentSchedule({
    from: week.fromIso,
    to: week.toIso,
  });

  const lessons = useMemo(() => data ?? [], [data]);

  // Bucket lessons per weekday (0=Mon..6=Sun), sorted by start time.
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

  const renderLesson = (lesson: MyScheduleLesson) => (
    <div
      key={lesson.id}
      className="rounded-xl border border-border bg-background p-3 text-sm"
    >
      <p className="truncate font-medium text-foreground">
        {lesson.subject.name}
      </p>
      <p className="truncate text-xs text-foreground-muted">
        {lesson.group.name}
      </p>
      <div className="mt-2 space-y-1 text-xs text-foreground-muted">
        <span className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {formatTimeRange(lesson.startsAt, lesson.endsAt)}
        </span>
        {lesson.room && (
          <span className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="truncate">{lesson.room}</span>
          </span>
        )}
        {lesson.teacher && (
          <span className="flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="truncate">
              {lesson.teacher.lastName} {lesson.teacher.firstName}
            </span>
          </span>
        )}
      </div>
    </div>
  );

  const renderDayBody = (dayIndex: number) => {
    const dayLessons = lessonsByDay[dayIndex];
    if (dayLessons.length === 0) {
      return (
        <p className="py-3 text-center text-xs text-foreground-muted">
          {t('studentCabinet.schedule.noLessons')}
        </p>
      );
    }
    return <div className="space-y-2">{dayLessons.map(renderLesson)}</div>;
  };

  const renderDayHeader = (dayIndex: number) => {
    const date = week.days[dayIndex];
    const isToday = isSameDay(date, today);
    return (
      <div className="flex items-baseline gap-1.5">
        <span
          className={cn(
            'text-sm font-semibold',
            isToday ? 'text-primary' : 'text-foreground',
          )}
        >
          {t(`studentCabinet.schedule.weekdays.${WEEKDAY_KEYS[dayIndex]}`)}
        </span>
        <span
          className={cn(
            'text-xs',
            isToday ? 'text-primary' : 'text-foreground-muted',
          )}
        >
          {date.toLocaleDateString(undefined, {
            day: 'numeric',
            month: 'short',
          })}
        </span>
      </div>
    );
  };

  return (
    <div>
      {/* Week navigation */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={t('studentCabinet.schedule.prevWeek')}
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
          {t('studentCabinet.schedule.today')}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={t('studentCabinet.schedule.nextWeek')}
          onClick={() => setRef((r) => addWeeks(r, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <span className="ml-1 text-sm font-medium text-foreground">
          {t('studentCabinet.schedule.weekOf', { date: weekLabel })}
        </span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner />
        </div>
      ) : isError ? (
        <Card flush>
          <EmptyState
            title={t('studentCabinet.loadError')}
            icon={<CalendarDays className="h-6 w-6" aria-hidden />}
          />
        </Card>
      ) : lessons.length === 0 ? (
        <Card flush>
          <EmptyState
            title={t('studentCabinet.schedule.empty')}
            description={t('studentCabinet.schedule.emptyHint')}
            icon={<CalendarDays className="h-6 w-6" aria-hidden />}
          />
        </Card>
      ) : (
        <>
          {/* Desktop: 7-column horizontal track */}
          <div className="hidden overflow-x-auto pb-2 lg:block">
            <div className="grid min-w-[64rem] grid-cols-7 gap-3">
              {week.days.map((date, dayIndex) => (
                <div
                  key={date.toISOString()}
                  className={cn(
                    'flex flex-col rounded-2xl border bg-surface p-3',
                    isSameDay(date, today)
                      ? 'border-primary/40'
                      : 'border-border',
                  )}
                >
                  {renderDayHeader(dayIndex)}
                  <div className="mt-3 flex-1">{renderDayBody(dayIndex)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile / tablet: stacked day sections */}
          <div className="space-y-3 lg:hidden">
            {week.days.map((date, dayIndex) => {
              // Hide empty days on mobile to reduce noise.
              if (lessonsByDay[dayIndex].length === 0) return null;
              return (
                <div
                  key={date.toISOString()}
                  className={cn(
                    'rounded-2xl border bg-surface p-3',
                    isSameDay(date, today)
                      ? 'border-primary/40'
                      : 'border-border',
                  )}
                >
                  {renderDayHeader(dayIndex)}
                  <div className="mt-3">{renderDayBody(dayIndex)}</div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
