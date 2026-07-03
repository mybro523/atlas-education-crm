import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';

import { cn } from '@/shared/lib/cn';
import type { Lesson } from '@/entities/lesson';
import type { Week } from '@/features/schedule-editor';
import { isSameDay } from '@/features/schedule-editor';
import { LessonCard } from './LessonCard';

export interface WeekGridProps {
  week: Week;
  weekdayKeys: readonly string[];
  /** 7 buckets (Mon→Sun) of lessons for the visible week. */
  lessonsByDay: Lesson[][];
  /** ADMIN/FOUNDER may create/delete + add lessons anywhere. */
  canCrud: boolean;
  /** Per-lesson: may the caller conduct/edit this lesson (owner teacher too)? */
  canManageLesson: (lesson: Lesson) => boolean;
  onAddForDay: (date: Date) => void;
  onEditLesson: (lesson: Lesson) => void;
  onConductLesson: (lesson: Lesson) => void;
  onDeleteLesson: (lesson: Lesson) => void;
}

/**
 * Weekly lesson grid.
 * - >=lg: 7 columns side-by-side inside a horizontally-scrollable track.
 * - <lg: each day is a stacked section (flawless from 320px, no overflow).
 */
export function WeekGrid({
  week,
  weekdayKeys,
  lessonsByDay,
  canCrud,
  canManageLesson,
  onAddForDay,
  onEditLesson,
  onConductLesson,
  onDeleteLesson,
}: WeekGridProps) {
  const { t } = useTranslation();
  const today = new Date();

  const renderDayHeader = (dayIndex: number) => {
    const date = week.days[dayIndex];
    const isToday = isSameDay(date, today);
    return (
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-baseline gap-1.5">
          <span
            className={cn(
              'text-sm font-semibold',
              isToday ? 'text-primary' : 'text-foreground',
            )}
          >
            {t(`schedule.weekdays.${weekdayKeys[dayIndex]}`)}
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
        {canCrud && (
          <button
            type="button"
            onClick={() => onAddForDay(date)}
            aria-label={t('schedule.create')}
            className="rounded-md p-1 text-foreground-muted transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  };

  const renderDayBody = (dayIndex: number) => {
    const dayLessons = lessonsByDay[dayIndex];
    if (dayLessons.length === 0) {
      return (
        <p className="py-3 text-center text-xs text-foreground-muted">
          {t('schedule.noLessons')}
        </p>
      );
    }
    return (
      <div className="space-y-2">
        {dayLessons.map((lesson) => (
          <LessonCard
            key={lesson.id}
            lesson={lesson}
            canManage={canManageLesson(lesson)}
            canDelete={canCrud}
            onEdit={onEditLesson}
            onConduct={onConductLesson}
            onDelete={onDeleteLesson}
          />
        ))}
      </div>
    );
  };

  return (
    <>
      {/* Desktop: horizontal 7-column track */}
      <div className="hidden overflow-x-auto pb-2 lg:block">
        <div className="grid min-w-[64rem] grid-cols-7 gap-3">
          {week.days.map((date, dayIndex) => {
            const isToday = isSameDay(date, today);
            return (
              <div
                key={date.toISOString()}
                className={cn(
                  'flex flex-col rounded-2xl border bg-surface p-3',
                  isToday ? 'border-primary/40' : 'border-border',
                )}
              >
                {renderDayHeader(dayIndex)}
                <div className="mt-3 flex-1">{renderDayBody(dayIndex)}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile / tablet: stacked day sections */}
      <div className="space-y-3 lg:hidden">
        {week.days.map((date, dayIndex) => {
          const isToday = isSameDay(date, today);
          return (
            <div
              key={date.toISOString()}
              className={cn(
                'rounded-2xl border bg-surface p-3',
                isToday ? 'border-primary/40' : 'border-border',
              )}
            >
              {renderDayHeader(dayIndex)}
              <div className="mt-3">{renderDayBody(dayIndex)}</div>
            </div>
          );
        })}
      </div>
    </>
  );
}
