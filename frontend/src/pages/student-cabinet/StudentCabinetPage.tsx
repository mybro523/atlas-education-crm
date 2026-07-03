import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { CalendarDays, GraduationCap, TrendingUp, UserCircle } from 'lucide-react';

import { PageHeader } from '@/shared/ui';
import { CabinetTabs, type CabinetTab } from './ui/CabinetTabs';
import { MyGradesView } from './ui/MyGradesView';
import { MyPerformanceView } from './ui/MyPerformanceView';
import { MyScheduleView } from './ui/MyScheduleView';
import { MyProfileView } from './ui/MyProfileView';

type ViewId = 'grades' | 'performance' | 'schedule' | 'profile';

const TAB_IDS: ViewId[] = ['grades', 'performance', 'schedule', 'profile'];

/**
 * STUDENT cabinet — own data only (`/api/me/student/*`).
 * Tabbed shell over four subviews: grades, performance, schedule, profile.
 * The active tab is mirrored to the `?view=` search param for deep-linking.
 */
export function StudentCabinetPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  const rawView = searchParams.get('view');
  const active: ViewId =
    rawView && (TAB_IDS as string[]).includes(rawView)
      ? (rawView as ViewId)
      : 'grades';

  const tabs = useMemo<CabinetTab[]>(
    () => [
      {
        id: 'grades',
        label: t('studentCabinet.tabs.grades'),
        icon: GraduationCap,
      },
      {
        id: 'performance',
        label: t('studentCabinet.tabs.performance'),
        icon: TrendingUp,
      },
      {
        id: 'schedule',
        label: t('studentCabinet.tabs.schedule'),
        icon: CalendarDays,
      },
      {
        id: 'profile',
        label: t('studentCabinet.tabs.profile'),
        icon: UserCircle,
      },
    ],
    [t],
  );

  const handleChange = (id: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (id === 'grades') next.delete('view');
        else next.set('view', id);
        return next;
      },
      { replace: true },
    );
  };

  return (
    <div>
      <PageHeader
        title={t('studentCabinet.title')}
        description={t('studentCabinet.subtitle')}
      />

      <CabinetTabs tabs={tabs} active={active} onChange={handleChange} />

      {active === 'grades' && <MyGradesView />}
      {active === 'performance' && <MyPerformanceView />}
      {active === 'schedule' && <MyScheduleView />}
      {active === 'profile' && <MyProfileView />}
    </div>
  );
}
