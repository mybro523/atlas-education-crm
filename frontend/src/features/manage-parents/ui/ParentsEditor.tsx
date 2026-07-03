import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Trash2, Briefcase, Phone } from 'lucide-react';
import { Button, ConfirmDialog, EmptyState, useToast } from '@/shared/ui';
import { extractErrorMessage } from '@/shared/api';
import {
  useStudentParents,
  useAddParent,
  useUpdateParent,
  useDeleteParent,
  type CreateParentDto,
  type Parent,
} from '@/entities/student';
import { ParentRowForm } from './ParentRowForm';
import type { ParentDraft } from '../model/types';

export interface ParentsEditorProps {
  /**
   * When set, the editor works in LIVE mode: every add/edit/remove is persisted
   * immediately through the optimistic parent sub-routes. When undefined, it
   * works in DRAFT mode using `value`/`onChange` (parents ship with the new
   * student on create).
   */
  studentId?: string;
  /** DRAFT mode only: current parent drafts. */
  value?: ParentDraft[];
  /** DRAFT mode only: emit the updated draft list. */
  onChange?: (next: ParentDraft[]) => void;
}

let draftSeq = 0;
const nextLocalId = () => `p-${Date.now()}-${draftSeq++}`;

/**
 * Nested parents editor for the student form. Add / edit / remove parents,
 * including the searchable `workplace` field. Optimistic in live (edit) mode;
 * pure local staging in draft (create) mode.
 */
export function ParentsEditor({
  studentId,
  value = [],
  onChange,
}: ParentsEditorProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const live = Boolean(studentId);

  // Live-mode server data (only enabled when we have a studentId).
  const parentsQuery = useStudentParents(studentId);
  const addParent = useAddParent();
  const updateParent = useUpdateParent();
  const deleteParent = useDeleteParent();

  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // Normalize both modes into a single row shape for rendering.
  const rows: Array<Parent | ParentDraft> = live
    ? (parentsQuery.data ?? [])
    : value;

  const rowKey = (row: Parent | ParentDraft) =>
    'id' in row && row.id ? row.id : (row as ParentDraft)._localId;

  const rowName = (row: Parent | ParentDraft) =>
    `${row.firstName} ${row.lastName}`.trim();

  /* ----------------------------- Add ----------------------------- */
  const handleAdd = (dto: CreateParentDto) => {
    if (live && studentId) {
      addParent.mutate(
        { studentId, dto },
        {
          onSuccess: () => {
            toast.success(t('students.parents.added'));
            setAdding(false);
          },
          onError: (err) =>
            toast.error(extractErrorMessage(err) ?? t('form.createError')),
        },
      );
    } else {
      onChange?.([...value, { ...dto, _localId: nextLocalId() }]);
      setAdding(false);
    }
  };

  /* ----------------------------- Edit ---------------------------- */
  const handleEdit = (row: Parent | ParentDraft, dto: CreateParentDto) => {
    if (live && studentId && 'id' in row && row.id) {
      updateParent.mutate(
        { studentId, parentId: row.id, dto },
        {
          onSuccess: () => {
            toast.success(t('students.parents.updated'));
            setEditingId(null);
          },
          onError: (err) =>
            toast.error(extractErrorMessage(err) ?? t('form.updateError')),
        },
      );
    } else {
      const localId = (row as ParentDraft)._localId;
      onChange?.(
        value.map((p) =>
          p._localId === localId ? { ...p, ...dto } : p,
        ),
      );
      setEditingId(null);
    }
  };

  /* ---------------------------- Delete --------------------------- */
  const confirmDelete = () => {
    if (!pendingDelete) return;
    const id = pendingDelete.id;
    if (live && studentId) {
      deleteParent.mutate(
        { studentId, parentId: id },
        {
          onSuccess: () => toast.success(t('students.parents.deleted')),
          onError: (err) =>
            toast.error(extractErrorMessage(err) ?? t('form.deleteError')),
        },
      );
    } else {
      onChange?.(value.filter((p) => p._localId !== id));
    }
    setPendingDelete(null);
  };

  const busy =
    addParent.isPending || updateParent.isPending || deleteParent.isPending;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          {t('students.parents.title')}
          {rows.length > 0 && (
            <span className="ml-1.5 text-foreground-muted">
              ({rows.length})
            </span>
          )}
        </h3>
        {!adding && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setAdding(true);
              setEditingId(null);
            }}
          >
            <Plus className="h-4 w-4" />
            {t('students.parents.add')}
          </Button>
        )}
      </div>

      {adding && (
        <ParentRowForm
          submitting={addParent.isPending}
          onSubmit={handleAdd}
          onCancel={() => setAdding(false)}
        />
      )}

      {rows.length === 0 && !adding ? (
        <div className="rounded-xl border border-dashed border-border">
          <EmptyState
            title={t('students.parents.empty')}
            description={t('students.parents.emptyHint')}
            icon={<Briefcase className="h-6 w-6" aria-hidden />}
          />
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => {
            const id = rowKey(row);
            const editing = editingId === id;
            return (
              <li key={id}>
                {editing ? (
                  <ParentRowForm
                    initial={{
                      firstName: row.firstName,
                      lastName: row.lastName,
                      phone: row.phone,
                      workplace: row.workplace ?? undefined,
                    }}
                    submitting={updateParent.isPending}
                    onSubmit={(dto) => handleEdit(row, dto)}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <div className="flex items-start justify-between gap-3 rounded-xl border border-border bg-surface p-3">
                    <div className="min-w-0 space-y-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {rowName(row)}
                      </p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-foreground-muted">
                        <span className="inline-flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5" aria-hidden />
                          {row.phone}
                        </span>
                        {row.workplace && (
                          <span className="inline-flex items-center gap-1">
                            <Briefcase className="h-3.5 w-3.5" aria-hidden />
                            {row.workplace}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={t('actions.edit')}
                        disabled={busy}
                        onClick={() => {
                          setEditingId(id);
                          setAdding(false);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={t('actions.remove')}
                        disabled={busy}
                        onClick={() =>
                          setPendingDelete({ id, name: rowName(row) })
                        }
                        className="text-danger hover:bg-danger/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        title={t('students.parents.title')}
        description={t('students.parents.deleteConfirm', {
          name: pendingDelete?.name ?? '',
        })}
        confirmLabel={t('actions.remove')}
        confirming={deleteParent.isPending}
      />
    </div>
  );
}
