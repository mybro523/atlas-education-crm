import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { CalendarDays, GraduationCap, Info, Users } from 'lucide-react';

import { cn } from '@/shared/lib/cn';
import { PageHeader, EmptyState } from '@/shared/ui';
import { ROLES } from '@/shared/config';
import { useSessionStore, selectRole } from '@/entities/session';
import { MyGroupsTab } from './ui/MyGroupsTab';
import { MyStudentsTab } from './ui/MyStudentsTab';
import { MyScheduleTab } from './ui/MyScheduleTab';

type TabKey = 'groups' | 'students' | 'schedule';

const TABS: Array<{ key: TabKey; icon: typeof Users }> = [
  { key: 'groups', icon: GraduationCap },
  { key: 'students', icon: Users },
  { key: 'schedule', icon: CalendarDays },
];

/**
 * Teacher cabinet: "my groups" (→ journals), "my students" (with parents'
 * phones for calling) and "my schedule" (week view). Data comes from the
 * `/me/teacher/*` self endpoints, so it is inherently teacher-scoped.
 *
 * RBAC: TEACHER (own data). ADMIN / FOUNDER may reach the page but the
 * self endpoints are teacher-only, so they see an informative note.
 */
export function TeacherCabinetPage() {
  const { t } = useTranslation();
  const role = useSessionStore(selectRole);
  const isTeacher = role === ROLES.TEACHER;

  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as TabKey) ?? 'groups';
  const [tab, setTab] = useState<TabKey>(
    TABS.some((tabItem) => tabItem.key === initialTab) ? initialTab : 'groups',
  );

  const selectTab = (next: TabKey) => {
    setTab(next);
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        params.set('tab', next);
        return params;
      },
      { replace: true },
    );
  };

  return (
    <div>
      <PageHeader
        title={t('teacherCabinet.title')}
        description={t('teacherCabinet.subtitle')}
      />

      {!isTeacher ? (
        <div className="rounded-2xl border border-border bg-surface">
          <EmptyState
            title={t('teacherCabinet.teachersOnly')}
            description={t('teacherCabinet.teachersOnlyHint')}
            icon={<Info className="h-6 w-6" aria-hidden />}
          />
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div
            role="tablist"
            aria-label={t('teacherCabinet.title')}
            className="mb-5 flex gap-1 overflow-x-auto rounded-xl border border-border bg-surface p-1"
          >
            {TABS.map(({ key, icon: Icon }) => {
              const active = tab === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => selectTab(key)}
                  className={cn(
                    'inline-flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    active
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-foreground-muted hover:bg-surface-muted hover:text-foreground',
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  {t(`teacherCabinet.tabs.${key}`)}
                </button>
              );
            })}
          </div>

          {tab === 'groups' && <MyGroupsTab />}
          {tab === 'students' && <MyStudentsTab />}
          {tab === 'schedule' && <MyScheduleTab />}
        </>
      )}
    </div>
  );
}
