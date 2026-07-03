import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Phone, Search, User, Users } from 'lucide-react';

import { Input, Card, Spinner, EmptyState, Badge } from '@/shared/ui';
import { useDebouncedValue } from '@/shared/lib/hooks';
import { useMyTeacherGroups, useMyTeacherStudents } from '@/entities/me';

/** A tap-friendly phone link (tel:) for calling students / parents. */
function PhoneLink({ label, phone }: { label: string; phone: string }) {
  const clean = phone.replace(/[^\d+]/g, '');
  return (
    <a
      href={`tel:${clean}`}
      className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-surface-muted px-2.5 py-1 text-sm text-foreground transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Phone className="h-3.5 w-3.5" aria-hidden />
      <span className="text-foreground-muted">{label}:</span>
      <span className="font-medium">{phone}</span>
    </a>
  );
}

/**
 * "My students" — the distinct active students across the teacher's groups,
 * with contact info incl. parents' phones (tap to call).
 */
export function MyStudentsTab() {
  const { t } = useTranslation();

  const [search, setSearch] = useState('');
  const [groupId, setGroupId] = useState('');
  const debouncedSearch = useDebouncedValue(search, 350);

  const { data: myGroups } = useMyTeacherGroups();
  const { data, isLoading, isError } = useMyTeacherStudents({
    search: debouncedSearch || undefined,
    groupId: groupId || undefined,
  });

  const students = useMemo(() => data ?? [], [data]);
  const groups = myGroups ?? [];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('teacherCabinet.searchStudents')}
          aria-label={t('teacherCabinet.searchStudents')}
          leftIcon={<Search className="h-4 w-4" />}
          className="sm:max-w-xs"
        />
        {groups.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setGroupId('')}
              aria-pressed={groupId === ''}
              className={
                groupId === ''
                  ? 'rounded-full bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground'
                  : 'rounded-full bg-surface-muted px-3 py-1.5 text-sm font-medium text-foreground hover:bg-border/60'
              }
            >
              {t('teacherCabinet.allGroups')}
            </button>
            {groups.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setGroupId(g.id)}
                aria-pressed={groupId === g.id}
                className={
                  groupId === g.id
                    ? 'rounded-full bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground'
                    : 'rounded-full bg-surface-muted px-3 py-1.5 text-sm font-medium text-foreground hover:bg-border/60'
                }
              >
                {g.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner />
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-border bg-surface">
          <EmptyState
            title={t('teacherCabinet.loadError')}
            icon={<Users className="h-6 w-6" aria-hidden />}
          />
        </div>
      ) : students.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface">
          <EmptyState
            title={t('teacherCabinet.noStudents')}
            description={t('teacherCabinet.noStudentsHint')}
            icon={<Users className="h-6 w-6" aria-hidden />}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {students.map((student) => (
            <Card key={student.id} className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700 dark:bg-brand-600/20 dark:text-brand-300">
                  <User className="h-5 w-5" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">
                    {student.lastName} {student.firstName}
                  </p>
                  {student.groups && student.groups.length > 0 && (
                    <div className="mt-0.5 flex flex-wrap gap-1">
                      {student.groups.map((g) => (
                        <Badge key={g.id} variant="muted">
                          {g.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {student.phone && (
                  <PhoneLink
                    label={t('teacherCabinet.studentPhone')}
                    phone={student.phone}
                  />
                )}
                {(student.parents ?? []).map((parent, idx) => (
                  <PhoneLink
                    key={`${parent.phone}-${idx}`}
                    label={`${parent.lastName} ${parent.firstName}`.trim() ||
                      t('teacherCabinet.parentPhone')}
                    phone={parent.phone}
                  />
                ))}
                {!student.phone &&
                  (student.parents ?? []).length === 0 && (
                    <span className="text-sm text-foreground-muted">
                      {t('teacherCabinet.noContacts')}
                    </span>
                  )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
