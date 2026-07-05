import { useTranslation } from 'react-i18next';
import { Check, Clock, MapPin, Pencil, Trash2, Undo2, User } from 'lucide-react';

import { cn } from '@/shared/lib/cn';
import { Badge } from '@/shared/ui';
import type { Lesson } from '@/entities/lesson';
import type { LessonView } from '@/features/schedule-editor';

export interface LessonCardProps {
  lesson: Lesson;
  /** Resolved display fields (course/teacher/room + time label). */
  view: LessonView;
  /** May the caller edit + conduct this lesson (owner teacher or admin/founder). */
  canManage: boolean;
  /** May the caller delete this lesson (admin/founder only). */
  canDelete: boolean;
  onEdit: (lesson: Lesson) => void;
  onConduct: (lesson: Lesson) => void;
  onDelete: (lesson: Lesson) => void;
}

/** A single lesson tile inside the schedule grid. Course-labelled, themed. */
export function LessonCard({
  lesson,
  view,
  canManage,
  canDelete,
  onEdit,
  onConduct,
  onDelete,
}: LessonCardProps) {
  const { t } = useTranslation();

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
          <span>{view.timeLabel}</span>
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

      <p className="mt-1.5 truncate text-sm font-semibold text-foreground">
        {view.courseName}
      </p>
      {view.groupName && (
        <p className="truncate text-xs text-foreground-muted">
          {view.groupName}
        </p>
      )}

      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-foreground-muted">
        {view.teacherName && (
          <span className="flex min-w-0 items-center gap-0.5">
            <User className="h-3 w-3 shrink-0" aria-hidden />
            <span className="truncate">{view.teacherName}</span>
          </span>
        )}
        <span className="flex items-center gap-0.5">
          <MapPin className="h-3 w-3 shrink-0" aria-hidden />
          {view.roomName ?? t('schedule.fields.noRoom')}
        </span>
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
