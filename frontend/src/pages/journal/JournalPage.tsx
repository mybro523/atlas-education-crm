import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';

import { PageHeader, Select, Spinner } from '@/shared/ui';
import { useStudent } from '@/entities/student';
import { JournalMatrix } from '@/widgets/JournalMatrix';
import { StudentDetailModal } from '@/widgets/StudentDetail';
import { useJournalGroups } from './ui/useJournalGroups';

/**
 * Journal page: pick a group, then edit the students × lessons matrix
 * (grades, attendance, remarks, mark-conducted) via the JournalMatrix widget.
 * The selected group is kept in the URL (`?groupId=`) for linkability.
 *
 * RBAC: TEACHER (own groups), ADMIN, FOUNDER.
 */
export function JournalPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  const { groups, isLoading } = useJournalGroups();
  const groupId = searchParams.get('groupId') ?? '';

  // Clicking a student name in the matrix opens the read-only profile card.
  const [detailStudentId, setDetailStudentId] = useState<string | null>(null);
  const { data: detailStudent } = useStudent(detailStudentId ?? undefined);

  const groupOptions = useMemo(
    () => [
      { value: '', label: t('journal.selectGroupPlaceholder') },
      ...groups.map((g) => ({ value: g.id, label: g.name })),
    ],
    [groups, t],
  );

  const setGroup = (value: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set('groupId', value);
        else next.delete('groupId');
        return next;
      },
      { replace: true },
    );
  };

  return (
    <div>
      <PageHeader
        title={t('journal.title')}
        description={t('journal.subtitle')}
        actions={
          isLoading ? (
            <Spinner />
          ) : (
            <Select
              options={groupOptions}
              value={groupId}
              onChange={(e) => setGroup(e.target.value)}
              aria-label={t('journal.selectGroup')}
              className="min-w-52"
            />
          )
        }
      />

      <JournalMatrix
        groupId={groupId || undefined}
        onStudentClick={setDetailStudentId}
      />

      <StudentDetailModal
        open={Boolean(detailStudentId)}
        onClose={() => setDetailStudentId(null)}
        student={detailStudent ?? null}
      />
    </div>
  );
}
