import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, UserPlus } from 'lucide-react';

import { cn } from '@/shared/lib/cn';
import { useDebouncedValue } from '@/shared/lib/hooks';
import {
  Modal,
  Input,
  Button,
  Spinner,
  EmptyState,
  useToast,
} from '@/shared/ui';
import { useStudents } from '@/entities/student';
import { useAddGroupStudent } from '@/entities/group';

export interface AddStudentModalProps {
  open: boolean;
  onClose: () => void;
  groupId: string;
  branchId?: string;
  /** Ids of students already in the group (disabled in the picker). */
  existingStudentIds: string[];
}

/**
 * Search + pick a student to add to a group. Server-side search (name OR parent
 * workplace, per contract §6). Adding is optimistic via `useAddGroupStudent`.
 */
export function AddStudentModal({
  open,
  onClose,
  groupId,
  branchId,
  existingStudentIds,
}: AddStudentModalProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim(), 350);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const { data, isLoading } = useStudents({
    search: debouncedSearch || undefined,
    branchId,
    pageSize: 20,
  });

  const addStudent = useAddGroupStudent();

  const existing = useMemo(
    () => new Set(existingStudentIds),
    [existingStudentIds],
  );

  const students = data?.items ?? [];

  const handleAdd = (studentId: string) => {
    setPendingId(studentId);
    addStudent.mutate(
      { groupId, dto: { studentId } },
      {
        onSuccess: () => {
          toast.success(t('groups.detail.addedToast'));
        },
        onError: () => {
          toast.error(t('groups.saveError'));
        },
        onSettled: () => setPendingId(null),
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
          ) : students.length === 0 ? (
            <EmptyState
              title={t('groups.addStudentModal.empty')}
              icon={<UserPlus className="h-6 w-6" aria-hidden />}
            />
          ) : (
            <ul className="divide-y divide-border">
              {students.map((student) => {
                const already = existing.has(student.id);
                const busy =
                  pendingId === student.id && addStudent.isPending;
                return (
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
                      variant={already ? 'ghost' : 'primary'}
                      disabled={already || busy}
                      loading={busy}
                      onClick={() => handleAdd(student.id)}
                      className={cn('shrink-0')}
                    >
                      {already
                        ? t('groups.addStudentModal.alreadyIn')
                        : t('groups.addStudentModal.add')}
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex justify-end pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t('common.close')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
