import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, UserPlus } from 'lucide-react';

import { useDebouncedValue } from '@/shared/lib/hooks';
import {
  Modal,
  Input,
  Button,
  Spinner,
  EmptyState,
  useToast,
} from '@/shared/ui';
import { useAvailableStudents, useAddGroupStudent } from '@/entities/group';

export interface AddStudentModalProps {
  open: boolean;
  onClose: () => void;
  groupId: string;
}

const PAGE_SIZE = 20;

/**
 * Search + pick a student to enrol into a group.
 *
 * Sources candidates from `GET /groups/:id/available-students` — the pool of
 * students NOT already active in the group, intentionally CROSS-BRANCH (a
 * student may join a group in any branch). This is what fixes the old
 * "Студенты не найдены" bug: the previous implementation searched the
 * branch-scoped student list, so students from other branches never appeared.
 *
 * Adding is optimistic (`useAddGroupStudent`) — the group's `studentsCount`
 * updates instantly and the candidate is removed from the list immediately
 * (tracked in `addedIds`), well before the server round-trip settles. The add
 * endpoint is idempotent, so a re-add never 409s.
 */
export function AddStudentModal({
  open,
  onClose,
  groupId,
}: AddStudentModalProps) {
  const { t } = useTranslation();
  const toast = useToast();

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  /** Ids added in this session — hidden instantly for optimistic feedback. */
  const [addedIds, setAddedIds] = useState<Set<string>>(() => new Set());

  // Reset transient state each time the modal opens.
  useEffect(() => {
    if (!open) return;
    setSearch('');
    setAddedIds(new Set());
  }, [open]);

  const { data, isLoading, isError } = useAvailableStudents(
    open ? groupId : undefined,
    { search: debouncedSearch || undefined, pageSize: PAGE_SIZE },
  );

  const addStudent = useAddGroupStudent();

  const students = useMemo(
    () => (data?.items ?? []).filter((s) => !addedIds.has(s.id)),
    [data, addedIds],
  );

  const total = data?.meta.total ?? 0;
  const hasMore = total > (data?.items.length ?? 0);

  const handleAdd = (studentId: string) => {
    // Hide the candidate instantly (optimistic). Restore it if the add fails.
    setAddedIds((prev) => new Set(prev).add(studentId));
    addStudent.mutate(
      { groupId, dto: { studentId } },
      {
        onSuccess: () => toast.success(t('groups.detail.addedToast')),
        onError: () => {
          toast.error(t('groups.saveError'));
          setAddedIds((prev) => {
            const next = new Set(prev);
            next.delete(studentId);
            return next;
          });
        },
      },
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('groups.addStudentModal.title')}
      closeLabel={t('common.close')}
    >
      <div className="space-y-4">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('groups.addStudentModal.searchPlaceholder')}
          leftIcon={<Search className="h-4 w-4" />}
          autoFocus
          aria-label={t('common.search')}
        />

        <div className="max-h-80 overflow-y-auto rounded-xl border border-border">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Spinner />
            </div>
          ) : isError ? (
            <EmptyState
              title={t('form.loadError')}
              icon={<UserPlus className="h-6 w-6" aria-hidden />}
            />
          ) : students.length === 0 ? (
            <EmptyState
              title={t('groups.addStudentModal.empty')}
              icon={<UserPlus className="h-6 w-6" aria-hidden />}
            />
          ) : (
            <ul className="divide-y divide-border">
              {students.map((student) => (
                <li
                  key={student.id}
                  className="flex items-center justify-between gap-3 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {student.lastName} {student.firstName}
                    </p>
                    {student.phone && (
                      <p className="truncate text-xs text-foreground-muted">
                        {student.phone}
                      </p>
                    )}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="primary"
                    onClick={() => handleAdd(student.id)}
                    className="shrink-0"
                  >
                    {t('groups.addStudentModal.add')}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {hasMore && (
          <p className="text-center text-xs text-foreground-muted">
            {t('groups.addStudentModal.refineHint')}
          </p>
        )}

        <div className="flex justify-end pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t('common.close')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
