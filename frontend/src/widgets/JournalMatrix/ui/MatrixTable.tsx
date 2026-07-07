import { useTranslation } from 'react-i18next';
import { Check, Undo2 } from 'lucide-react';

import { cn } from '@/shared/lib/cn';
import type { JournalMatrix, JournalCell } from '@/entities/grade';
import {
  gradeChipClass,
  attendanceCellClass,
  attendanceMarkKey,
} from '../model/cellStyles';

export interface MatrixTableProps {
  matrix: JournalMatrix;
  /** May the current user edit cells + mark lessons conducted. */
  canEdit: boolean;
  onCellClick: (studentIndex: number, lessonId: string) => void;
  onToggleConducted: (lessonId: string, next: boolean) => void;
  /** Whether a conduct toggle is currently in flight (disables the buttons). */
  conductingId?: string | null;
  /** When provided, student names become clickable (e.g. to open the profile). */
  onStudentClick?: (studentId: string) => void;
}

function formatLessonHeader(startsAt: string): { date: string; weekday: string } {
  const d = new Date(startsAt);
  return {
    date: d.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' }),
    weekday: d.toLocaleDateString(undefined, { weekday: 'short' }),
  };
}

/**
 * Students (rows) × lessons (columns) journal grid.
 *
 * - First column (student names) is sticky so it stays visible while the
 *   lesson columns scroll horizontally (mobile-first: the whole table scrolls
 *   inside its container at 320–425px).
 * - Each cell shows the grade chip, an attendance marker and a remark dot.
 * - Lesson headers carry a mark-conducted toggle for editors.
 */
export function MatrixTable({
  matrix,
  canEdit,
  onCellClick,
  onToggleConducted,
  conductingId,
  onStudentClick,
}: MatrixTableProps) {
  const { t } = useTranslation();

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th
              scope="col"
              className="sticky left-0 z-20 min-w-[9rem] border-b border-r border-border bg-surface-muted px-3 py-2 text-left align-bottom font-semibold text-foreground"
            >
              {t('journal.student')}
            </th>
            {matrix.lessons.map((lesson) => {
              const { date, weekday } = formatLessonHeader(lesson.startsAt);
              return (
                <th
                  key={lesson.id}
                  scope="col"
                  className="min-w-[3.5rem] border-b border-border bg-surface-muted px-1.5 py-2 text-center align-bottom font-medium"
                >
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xs capitalize text-foreground-muted">
                      {weekday}
                    </span>
                    <span className="whitespace-nowrap text-xs font-semibold text-foreground">
                      {date}
                    </span>
                    {canEdit ? (
                      <button
                        type="button"
                        disabled={conductingId === lesson.id}
                        onClick={() =>
                          onToggleConducted(lesson.id, !lesson.isConducted)
                        }
                        aria-label={
                          lesson.isConducted
                            ? t('journal.markNotConducted')
                            : t('journal.markConducted')
                        }
                        title={
                          lesson.isConducted
                            ? t('journal.markNotConducted')
                            : t('journal.markConducted')
                        }
                        className={cn(
                          'flex h-6 w-6 items-center justify-center rounded-md transition-colors',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50',
                          lesson.isConducted
                            ? 'bg-success/15 text-success hover:bg-success/25'
                            : 'bg-surface text-foreground-muted hover:bg-border/60',
                        )}
                      >
                        {lesson.isConducted ? (
                          <Undo2 className="h-3.5 w-3.5" />
                        ) : (
                          <Check className="h-3.5 w-3.5" />
                        )}
                      </button>
                    ) : (
                      <span
                        className={cn(
                          'h-2 w-2 rounded-full',
                          lesson.isConducted ? 'bg-success' : 'bg-border',
                        )}
                        aria-label={
                          lesson.isConducted
                            ? t('journal.conducted')
                            : t('journal.notConducted')
                        }
                      />
                    )}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {matrix.students.map((row, studentIndex) => (
            <tr key={row.student.id} className="group">
              <th
                scope="row"
                className="sticky left-0 z-10 min-w-[9rem] max-w-[12rem] border-b border-r border-border bg-surface px-3 py-2 text-left font-medium text-foreground group-hover:bg-surface-muted"
              >
                {onStudentClick ? (
                  <button
                    type="button"
                    onClick={() => onStudentClick(row.student.id)}
                    title={`${row.student.lastName} ${row.student.firstName}`}
                    className={cn(
                      'block w-full truncate rounded text-left font-medium text-foreground transition-colors',
                      'hover:text-primary hover:underline',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    )}
                  >
                    {row.student.lastName} {row.student.firstName}
                  </button>
                ) : (
                  <span className="block truncate">
                    {row.student.lastName} {row.student.firstName}
                  </span>
                )}
              </th>
              {matrix.lessons.map((lesson) => {
                const cell: JournalCell = row.cells[lesson.id] ?? {};
                const hasRemarks = (cell.remarks ?? 0) > 0;
                return (
                  <td
                    key={lesson.id}
                    className={cn(
                      'border-b border-border p-0 text-center',
                      attendanceCellClass(cell.attendance),
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => onCellClick(studentIndex, lesson.id)}
                      disabled={!canEdit}
                      className={cn(
                        'relative flex h-11 w-full min-w-[3.5rem] items-center justify-center transition-colors',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                        canEdit
                          ? 'cursor-pointer hover:bg-primary/5'
                          : 'cursor-default',
                      )}
                      aria-label={`${row.student.lastName} ${row.student.firstName} — ${formatLessonHeader(lesson.startsAt).date}`}
                    >
                      {cell.grade != null && (
                        <span
                          className={cn(
                            'inline-flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold',
                            gradeChipClass(cell.grade),
                          )}
                        >
                          {cell.grade}
                        </span>
                      )}
                      {cell.grade == null && cell.attendance && (
                        <span className="text-xs font-semibold text-foreground-muted">
                          {t(attendanceMarkKey(cell.attendance))}
                        </span>
                      )}
                      {hasRemarks && (
                        <span
                          className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-primary"
                          aria-label={t('journal.hasRemarks')}
                        />
                      )}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
