import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';

import { cn } from '@/shared/lib/cn';
import { isOptimisticId } from '@/shared/lib';
import type { Lesson } from '@/entities/lesson';
import {
  isSameDay,
  toDateInput,
  type MonthGrid as MonthGridModel,
  type LessonView,
} from '@/features/schedule-editor';
import { LessonCard } from './LessonCard';

export interface MonthGridProps {
  grid: MonthGridModel;
  weekdayKeys: readonly string[];
  /** Lessons bucketed by local `YYYY-MM-DD` day key. */
  lessonsByDate: Map<string, Lesson[]>;
  resolve: (lesson: Lesson) => LessonView;
  canCrud: boolean;
  canManageLesson: (lesson: Lesson) => boolean;
  onAddForDay: (date: Date) => void;
  onSelectDay: (date: Date) => void;
  onEditLesson: (lesson: Lesson) => void;
  onConductLesson: (lesson: Lesson) => void;
  onDeleteLesson: (lesson: Lesson) => void;
}

const MAX_CHIPS = 3;

/**
 * Full-month calendar.
 * - >=md: a 7-column calendar grid with compact lesson chips per day.
 * - <md: an agenda of the days in the month that actually have lessons
 *   (flawless from 320px), reusing the full LessonCard.
 */
export function MonthGrid({
  grid,
  weekdayKeys,
  lessonsByDate,
  resolve,
  canCrud,
  canManageLesson,
  onAddForDay,
  onSelectDay,
  onEditLesson,
  onConductLesson,
  onDeleteLesson,
}: MonthGridProps) {
  const { t } = useTranslation();
  const today = new Date();

  const lessonsFor = (date: Date): Lesson[] =>
    lessonsByDate.get(toDateInput(date)) ?? [];

  // ---- Desktop calendar -----------------------------------------------------
  const desktop = (
    <div className="hidden md:block">
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-t-2xl border border-border bg-border">
        {weekdayKeys.map((key) => (
          <div
            key={key}
            className="bg-surface px-2 py-2 text-center text-xs font-semibold text-foreground-muted"
          >
            {t(`schedule.weekdays.${key}`)}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-b-2xl border-x border-b border-border bg-border">
        {grid.days.map((date) => {
          const inMonth = date.getMonth() === grid.monthIndex;
          const isToday = isSameDay(date, today);
          const dayLessons = lessonsFor(date);
          const shown = dayLessons.slice(0, MAX_CHIPS);
          const overflow = dayLessons.length - shown.length;

          return (
            <div
              key={date.toISOString()}
              className={cn(
                'flex min-h-[7rem] flex-col gap-1 bg-surface p-1.5',
                !inMonth && 'bg-surface-muted/40',
              )}
            >
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => onSelectDay(date)}
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    isToday
                      ? 'bg-primary text-primary-foreground hover:bg-primary-hover'
                      : inMonth
                        ? 'text-foreground'
                        : 'text-foreground-muted',
                  )}
                >
                  {date.getDate()}
                </button>
                {canCrud && (
                  <button
                    type="button"
                    onClick={() => onAddForDay(date)}
                    aria-label={t('schedule.create')}
                    className="rounded-md p-0.5 text-foreground-muted transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-1">
                {shown.map((lesson) => {
                  const view = resolve(lesson);
                  const label = `${view.startTime} · ${view.courseName}`;
                  const chipClass = cn(
                    'w-full truncate rounded-md px-1.5 py-1 text-left text-[11px] font-medium leading-tight',
                    lesson.isConducted
                      ? 'bg-success/15 text-success'
                      : 'bg-brand-100 text-brand-700 dark:bg-brand-600/20 dark:text-brand-200',
                  );
                  return canManageLesson(lesson) ? (
                    <button
                      key={lesson.id}
                      type="button"
                      disabled={isOptimisticId(lesson.id)}
                      onClick={() => onEditLesson(lesson)}
                      title={`${view.timeLabel} · ${view.courseName}`}
                      className={cn(
                        chipClass,
                        'transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      )}
                    >
                      {label}
                    </button>
                  ) : (
                    <span
                      key={lesson.id}
                      title={`${view.timeLabel} · ${view.courseName}`}
                      className={chipClass}
                    >
                      {label}
                    </span>
                  );
                })}
                {overflow > 0 && (
                  <button
                    type="button"
                    onClick={() => onSelectDay(date)}
                    className="rounded-md px-1.5 py-0.5 text-left text-[11px] font-medium text-foreground-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {t('schedule.moreLessons', { count: overflow })}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // ---- Mobile agenda --------------------------------------------------------
  const agendaDays = grid.days.filter(
    (date) => date.getMonth() === grid.monthIndex && lessonsFor(date).length > 0,
  );

  const mobile = (
    <div className="space-y-3 md:hidden">
      {agendaDays.length === 0 && (
        <div className="rounded-2xl border border-border bg-surface px-6 py-10 text-center text-sm text-foreground-muted">
          {t('schedule.empty')}
        </div>
      )}
      {agendaDays.map((date) => {
        const isToday = isSameDay(date, today);
        return (
          <div
            key={date.toISOString()}
            className={cn(
              'rounded-2xl border bg-surface p-3',
              isToday ? 'border-primary/40' : 'border-border',
            )}
          >
            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => onSelectDay(date)}
                className={cn(
                  'text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  isToday ? 'text-primary' : 'text-foreground',
                )}
              >
                {date.toLocaleDateString(undefined, {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                })}
              </button>
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
            <div className="space-y-2">
              {lessonsFor(date).map((lesson) => (
                <LessonCard
                  key={lesson.id}
                  lesson={lesson}
                  view={resolve(lesson)}
                  canManage={canManageLesson(lesson)}
                  canDelete={canCrud}
                  onEdit={onEditLesson}
                  onConduct={onConductLesson}
                  onDelete={onDeleteLesson}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <>
      {desktop}
      {mobile}
    </>
  );
}
