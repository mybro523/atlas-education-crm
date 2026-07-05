import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { BookOpen, ClipboardList, GraduationCap, Users } from 'lucide-react';

import { Card, Spinner, EmptyState, Badge } from '@/shared/ui';
import { useMyTeacherGroups } from '@/entities/me';

/** "My groups" — the teacher's own groups, each opening its journal. */
export function MyGroupsTab() {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useMyTeacherGroups();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-border bg-surface">
        <EmptyState
          title={t('teacherCabinet.loadError')}
          icon={<Users className="h-6 w-6" aria-hidden />}
        />
      </div>
    );
  }

  const groups = data ?? [];

  if (groups.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface">
        <EmptyState
          title={t('teacherCabinet.noGroups')}
          description={t('teacherCabinet.noGroupsHint')}
          icon={<Users className="h-6 w-6" aria-hidden />}
        />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {groups.map((group) => (
        <Card key={group.id} className="flex flex-col">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700 dark:bg-brand-600/20 dark:text-brand-300">
              <GraduationCap className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-base font-semibold text-foreground">
                {group.name}
              </h3>
              {group.course?.name && (
                <p className="truncate text-sm text-foreground-muted">
                  {group.course.name}
                </p>
              )}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {group.studentsCount != null && (
              <Badge variant="muted">
                <Users className="h-3 w-3" aria-hidden />
                {t('teacherCabinet.studentsCount', {
                  count: group.studentsCount,
                })}
              </Badge>
            )}
            {group.lessonsCount != null && (
              <Badge variant="muted">
                <BookOpen className="h-3 w-3" aria-hidden />
                {t('teacherCabinet.lessonsCount', {
                  count: group.lessonsCount,
                })}
              </Badge>
            )}
          </div>

          <div className="mt-4 pt-1">
            <Link
              to={`/journal?groupId=${group.id}`}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-border bg-transparent px-4 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <ClipboardList className="h-4 w-4" aria-hidden />
              {t('teacherCabinet.openJournal')}
            </Link>
          </div>
        </Card>
      ))}
    </div>
  );
}
