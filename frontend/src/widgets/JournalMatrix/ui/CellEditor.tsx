import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageSquare, Trash2, X } from 'lucide-react';

import { cn } from '@/shared/lib/cn';
import { Modal, Button, Textarea, Spinner, useToast } from '@/shared/ui';
import type { AttendanceStatus, JournalCell } from '@/entities/grade';
import { useGradeEntry, GRADE_VALUES } from '@/features/grade-entry';
import {
  useAttendanceEntry,
  ATTENDANCE_STATUSES,
  attendanceLabelKey,
} from '@/features/attendance-entry';
import { useRemarkEntry } from '@/features/remark-entry';
import { gradeChipClass } from '../model/cellStyles';

export interface CellEditorContext {
  groupId: string;
  studentId: string;
  studentName: string;
  lessonId: string;
  lessonLabel: string;
  cell: JournalCell;
}

export interface CellEditorProps {
  open: boolean;
  onClose: () => void;
  /** May the current user edit this cell (owner teacher / admin / founder). */
  canEdit: boolean;
  context: CellEditorContext | null;
}

const attendanceBtnClass: Record<AttendanceStatus, string> = {
  PRESENT: 'data-[active=true]:bg-success data-[active=true]:text-white',
  LATE: 'data-[active=true]:bg-amber-500 data-[active=true]:text-white',
  ABSENT: 'data-[active=true]:bg-danger data-[active=true]:text-white',
};

/**
 * Journal cell editor: set the grade (2..5), attendance
 * (PRESENT/LATE/ABSENT) and add/remove remarks for one (student, lesson).
 * All mutations are OPTIMISTIC via the entry feature hooks.
 */
export function CellEditor({ open, onClose, canEdit, context }: CellEditorProps) {
  const { t } = useTranslation();
  const toast = useToast();

  const groupId = context?.groupId;
  const { setGrade, clearGrade } = useGradeEntry(groupId);
  const { setAttendance } = useAttendanceEntry(groupId);
  const remarkEntry = useRemarkEntry(
    groupId,
    context?.studentId,
    context?.lessonId,
  );

  const [remarkText, setRemarkText] = useState('');

  if (!context) return null;

  const { studentId, lessonId, cell, studentName, lessonLabel } = context;

  const onError = () => toast.error(t('journal.saveError'));

  const handleGrade = (value: number) => {
    if (!canEdit) return;
    if (cell.grade === value) {
      clearGrade(studentId, lessonId, { onError });
    } else {
      setGrade(studentId, lessonId, value, undefined, { onError });
    }
  };

  const handleAttendance = (status: AttendanceStatus) => {
    if (!canEdit) return;
    setAttendance(studentId, lessonId, status, { onError });
  };

  const handleAddRemark = () => {
    const text = remarkText.trim();
    if (!text) return;
    remarkEntry.addRemark(text, {
      onSuccess: () => setRemarkText(''),
      onError,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={studentName}
      closeLabel={t('common.close')}
      className="max-w-md"
    >
      <p className="-mt-2 mb-4 text-sm text-foreground-muted">{lessonLabel}</p>

      {/* Grade */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">
          {t('journal.grade')}
        </p>
        <div className="flex flex-wrap gap-2">
          {GRADE_VALUES.map((value) => {
            const active = cell.grade === value;
            return (
              <button
                key={value}
                type="button"
                disabled={!canEdit}
                onClick={() => handleGrade(value)}
                aria-pressed={active}
                className={cn(
                  'flex h-11 w-11 items-center justify-center rounded-xl text-base font-semibold transition-all',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  'disabled:cursor-not-allowed disabled:opacity-60',
                  active
                    ? cn(gradeChipClass(value), 'ring-2 ring-primary')
                    : 'bg-surface-muted text-foreground hover:bg-border/60',
                )}
              >
                {value}
              </button>
            );
          })}
          {cell.grade != null && canEdit && (
            <button
              type="button"
              onClick={() => clearGrade(studentId, lessonId, { onError })}
              aria-label={t('journal.clearGrade')}
              title={t('journal.clearGrade')}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-muted text-foreground-muted transition-colors hover:bg-danger/10 hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Attendance */}
      <div className="mt-5 space-y-2">
        <p className="text-sm font-medium text-foreground">
          {t('journal.attendanceLabel')}
        </p>
        <div className="grid grid-cols-3 gap-2">
          {ATTENDANCE_STATUSES.map((status) => {
            const active = cell.attendance === status;
            return (
              <button
                key={status}
                type="button"
                disabled={!canEdit}
                data-active={active}
                onClick={() => handleAttendance(status)}
                aria-pressed={active}
                className={cn(
                  'h-10 rounded-xl border border-border bg-surface-muted px-2 text-sm font-medium text-foreground transition-colors',
                  'hover:bg-border/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  'disabled:cursor-not-allowed disabled:opacity-60',
                  attendanceBtnClass[status],
                )}
              >
                {t(attendanceLabelKey(status))}
              </button>
            );
          })}
        </div>
      </div>

      {/* Remarks */}
      <div className="mt-5 space-y-2">
        <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          <MessageSquare className="h-4 w-4 text-foreground-muted" aria-hidden />
          {t('journal.remarks')}
        </p>

        {remarkEntry.isLoading ? (
          <div className="flex justify-center py-3">
            <Spinner />
          </div>
        ) : remarkEntry.remarks.length > 0 ? (
          <ul className="space-y-1.5">
            {remarkEntry.remarks.map((remark) => (
              <li
                key={remark.id}
                className="flex items-start gap-2 rounded-lg bg-surface-muted px-3 py-2 text-sm text-foreground"
              >
                <span className="min-w-0 flex-1 break-words">{remark.text}</span>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() =>
                      remarkEntry.removeRemark(remark.id, { onError })
                    }
                    aria-label={t('common.delete')}
                    title={t('common.delete')}
                    className="shrink-0 rounded-md p-1 text-foreground-muted transition-colors hover:bg-danger/10 hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-foreground-muted">{t('journal.noRemarks')}</p>
        )}

        {canEdit && (
          <div className="space-y-2 pt-1">
            <Textarea
              rows={2}
              value={remarkText}
              onChange={(e) => setRemarkText(e.target.value)}
              placeholder={t('journal.remarkPlaceholder')}
              aria-label={t('journal.remarkPlaceholder')}
            />
            <Button
              type="button"
              size="sm"
              fullWidth
              disabled={!remarkText.trim() || remarkEntry.isSaving}
              onClick={handleAddRemark}
            >
              {t('journal.addRemark')}
            </Button>
          </div>
        )}
      </div>

      <div className="mt-5 flex justify-end">
        <Button type="button" variant="secondary" onClick={onClose}>
          {t('common.done')}
        </Button>
      </div>
    </Modal>
  );
}
