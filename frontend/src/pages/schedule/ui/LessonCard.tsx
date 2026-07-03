import { useTranslation } from 'react-i18next';
import {
  Check,
  Clock,
  MapPin,
  Pencil,
  Trash2,
  Undo2,
} from 'lucide-react';

import { cn } from '@/shared/lib/cn';
import { Badge } from '@/shared/ui';
import type { Lesson } from '@/entities/lesson';
import { toTimeInput } from '@/features/schedule-editor';

export interface LessonCardProps {
  lesson: Lesson;
  /** May the caller edit + conduct this lesson (owner teacher or admin/founder). */
  canManage: boolean;
  /** May the caller delete this lesson (admin/founder only). */
  canDelete: boolean;
  onEdit: (lesson: Lesson) => void;
  onConduct: (lesson: Lesson) => void;
  onDelete: (lesson: Lesson) => void;
}

/** A single lesson tile inside the weekly grid. Themed + compact. */
export function LessonCard({
  lesson,
  canManage,
  canDelete,
  onEdit,
  onConduct,
  onDelete,
}: LessonCardProps) {
  const { t } = useTranslation();

  const start = toTimeInput(new Date(lesson.startsAt));
  const end = lesson.endsAt ? toTimeInput(new Date(lesson.endsAt)) : null;

  const teacherName = lesson.teacher
    ? `${lesson.teacher.lastName} ${lesson.teacher.firstName}`
    : null;

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
            ? t('schedule.conducted')
            : t('schedule.notConducted')}
        </Badge>
      </div>

      <p className="mt-1.5 truncate text-sm font-medium text-foreground">
        {lesson.group?.name ?? '—'}
      </p>
      {lesson.topic && (
        <p className="truncate text-xs text-foreground-muted">{lesson.topic}</p>
      )}

      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-foreground-muted">
        {teacherName && <span className="truncate">{teacherName}</span>}
        {lesson.room && (
          <span className="flex items-center gap-0.5">
            <MapPin className="h-3 w-3" aria-hidden />
            {lesson.room}
          </span>
        )}
      </div>

      {(canManage || canDelete) && (
        <div className="mt-2 flex items-center gap-1 border-t border-border/60 pt-2">
          {canManage && (
            <>
              <button
                type="button"
                onClick={() => onConduct(lesson)}
                aria-label={
                  lesson.isConducted
                    ? t('schedule.markNotConducted')
                    : t('schedule.markConducted')
                }
                title={
                  lesson.isConducted
                    ? t('schedule.markNotConducted')
                    : t('schedule.markConducted')
                }
                className={cn(
                  'rounded-md p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  lesson.isConducted
                    ? 'text-foreground-muted hover:bg-surface-muted'
                    : 'text-success hover:bg-success/10',
                )}
              >
                {lesson.isConducted ? (
                  <Undo2 className="h-4 w-4" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
              </button>
              <button
                type="button"
                onClick={() => onEdit(lesson)}
                aria-label={t('common.edit')}
                title={t('common.edit')}
                className="rounded-md p-1.5 text-foreground-muted transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Pencil className="h-4 w-4" />
              </button>
            </>
          )}
          {canDelete && (
            <button
              type="button"
              onClick={() => onDelete(lesson)}
              aria-label={t('common.delete')}
              title={t('common.delete')}
              className="ml-auto rounded-md p-1.5 text-foreground-muted transition-colors hover:bg-danger/10 hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
