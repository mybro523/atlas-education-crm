import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ClipboardList, Lock } from 'lucide-react';

import { Spinner, EmptyState, useToast } from '@/shared/ui';
import { useJournalMatrix } from '@/entities/grade';
import { useCanManageGroup } from '@/features/manage-group-students';
import { useMarkConducted } from '@/features/mark-conducted';
import { MatrixTable } from './MatrixTable';
import { CellEditor, type CellEditorContext } from './CellEditor';

export interface JournalMatrixProps {
  /** Group whose journal to render. When empty, a prompt is shown. */
  groupId: string | undefined;
}

function lessonLabel(startsAt: string, topic?: string | null): string {
  const d = new Date(startsAt);
  const date = d.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
  });
  const time = d.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
  return topic ? `${date}, ${time} · ${topic}` : `${date}, ${time}`;
}

/**
 * Journal matrix for a group: students (rows) × lessons (columns) showing grade
 * + attendance; click a cell to set grade / attendance / remark. Includes the
 * mark-lesson-conducted action. All writes are OPTIMISTIC.
 *
 * RBAC: editing is allowed for ADMIN, FOUNDER and the owning TEACHER; other
 * viewers see a read-only grid.
 */
export function JournalMatrix({ groupId }: JournalMatrixProps) {
  const { t } = useTranslation();
  const toast = useToast();

  const { data: matrix, isLoading, isError } = useJournalMatrix(groupId);
  const canEdit = useCanManageGroup(groupId);
  const { setConducted } = useMarkConducted(groupId);

  const [conductingId, setConductingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<CellEditorContext | null>(null);

  const editorContext = useMemo<CellEditorContext | null>(() => {
    if (!editing || !matrix) return null;
    // Re-derive the live cell from the (optimistically updated) matrix so the
    // editor reflects the latest grade/attendance/remark state instantly.
    const row = matrix.students.find(
      (s) => s.student.id === editing.studentId,
    );
    if (!row) return null;
    return { ...editing, cell: row.cells[editing.lessonId] ?? {} };
  }, [editing, matrix]);

  if (!groupId) {
    return (
      <div className="rounded-2xl border border-border bg-surface">
        <EmptyState
          title={t('journal.pickGroup')}
          description={t('journal.pickGroupHint')}
          icon={<ClipboardList className="h-6 w-6" aria-hidden />}
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    );
  }

  if (isError || !matrix) {
    return (
      <div className="rounded-2xl border border-border bg-surface">
        <EmptyState
          title={t('journal.loadError')}
          description={t('journal.loadErrorHint')}
          icon={<Lock className="h-6 w-6" aria-hidden />}
        />
      </div>
    );
  }

  if (matrix.students.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface">
        <EmptyState
          title={t('journal.noStudents')}
          description={t('journal.noStudentsHint')}
          icon={<ClipboardList className="h-6 w-6" aria-hidden />}
        />
      </div>
    );
  }

  if (matrix.lessons.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface">
        <EmptyState
          title={t('journal.noLessons')}
          description={t('journal.noLessonsHint')}
          icon={<ClipboardList className="h-6 w-6" aria-hidden />}
        />
      </div>
    );
  }

  const handleCellClick = (studentIndex: number, lessonId: string) => {
    if (!canEdit) return;
    const row = matrix.students[studentIndex];
    const lesson = matrix.lessons.find((l) => l.id === lessonId);
    if (!row || !lesson) return;
    setEditing({
      groupId,
      studentId: row.student.id,
      studentName: `${row.student.lastName} ${row.student.firstName}`,
      lessonId,
      lessonLabel: lessonLabel(lesson.startsAt, lesson.topic),
      cell: row.cells[lessonId] ?? {},
    });
  };

  const handleToggleConducted = (lessonId: string, next: boolean) => {
    setConductingId(lessonId);
    setConducted(lessonId, next, {
      onSuccess: () => {
        setConductingId(null);
        toast.success(
          next ? t('journal.conductedToast') : t('journal.notConductedToast'),
        );
      },
      onError: () => {
        setConductingId(null);
        toast.error(t('journal.saveError'));
      },
    });
  };

  return (
    <>
      <MatrixTable
        matrix={matrix}
        canEdit={canEdit}
        onCellClick={handleCellClick}
        onToggleConducted={handleToggleConducted}
        conductingId={conductingId}
      />

      {/* Mounted only with a real cell context so the remark query (keyed by
          student+lesson) never fires an unscoped list request. */}
      {editorContext && (
        <CellEditor
          open
          onClose={() => setEditing(null)}
          canEdit={canEdit}
          context={editorContext}
        />
      )}
    </>
  );
}
