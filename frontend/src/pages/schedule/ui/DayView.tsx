import { useTranslation } from 'react-i18next';
import { CalendarDays, Plus } from 'lucide-react';

import { cn } from '@/shared/lib/cn';
import { Button, EmptyState } from '@/shared/ui';
import type { Lesson } from '@/entities/lesson';
import { isSameDay, type LessonView } from '@/features/schedule-editor';
import { LessonCard } from './LessonCard';

export interface DayViewProps {
  day: Date;
  /** Lessons of the day, already sorted by start time. */
  lessons: Lesson[];
  resolve: (lesson: Lesson) => LessonView;
  canCrud: boolean;
  canManageLesson: (lesson: Lesson) => boolean;
  onAddForDay: (date: Date) => void;
  onEditLesson: (lesson: Lesson) => void;
  onConductLesson: (lesson: Lesson) => void;
  onDeleteLesson: (lesson: Lesson) => void;
}

/** Single-day agenda. One readable column; flawless from 320px. */
export function DayView({
  day,
  lessons,
  resolve,
  canCrud,
  canManageLesson,
  onAddForDay,
  onEditLesson,
  onConductLesson,
  onDeleteLesson,
}: DayViewProps) {
  const { t } = useTranslation();
  const isToday = isSameDay(day, new Date());

  return (
    <div
      className={cn(
        'mx-auto max-w-2xl rounded-2xl border bg-surface p-3 sm:p-4',
        isToday ? 'border-primary/40' : 'border-border',
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2
          className={cn(
            'text-sm font-semibold sm:text-base',
            isToday ? 'text-primary' : 'text-foreground',
          )}
        >
          {day.toLocaleDateString(undefined, {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}
        </h2>
        {canCrud && (
          <Button type="button" size="sm" onClick={() => onAddForDay(day)}>
            <Plus className="h-4 w-4" />
            {t('schedule.create')}
          </Button>
        )}
      </div>

      {lessons.length === 0 ? (
        <EmptyState
          title={t('schedule.emptyDay')}
          description={canCrud ? t('schedule.emptyHint') : undefined}
          icon={<CalendarDays className="h-6 w-6" aria-hidden />}
        />
      ) : (
        <div className="space-y-2">
          {lessons.map((lesson) => (
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
      )}
    </div>
  );
}
