import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';

import { PageHeader, Select, Spinner } from '@/shared/ui';
import { JournalMatrix } from '@/widgets/JournalMatrix';
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

      <JournalMatrix groupId={groupId || undefined} />
    </div>
  );
}
