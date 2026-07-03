import { useTranslation } from 'react-i18next';
import { BarChart3, TrendingUp } from 'lucide-react';

import { Badge, Card, EmptyState, Spinner } from '@/shared/ui';
import { useMyPerformance } from '@/entities/me';
import {
  PerformanceChart,
  formatAverage,
  gradeVariant,
} from '@/features/view-performance';

/**
 * "My performance" — per-subject average grade + attendance counts, an overall
 * summary, and a responsive bar chart of averages. Table on >=sm, stacked cards
 * on mobile (flawless from 320px).
 */
export function MyPerformanceView() {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useMyPerformance();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner />
      </div>
    );
  }

  if (isError) {
    return (
      <Card flush>
        <EmptyState
          title={t('studentCabinet.loadError')}
          icon={<TrendingUp className="h-6 w-6" aria-hidden />}
        />
      </Card>
    );
  }

  const rows = data?.bySubject ?? [];

  if (rows.length === 0) {
    return (
      <Card flush>
        <EmptyState
          title={t('studentCabinet.performance.empty')}
          description={t('studentCabinet.performance.emptyHint')}
          icon={<TrendingUp className="h-6 w-6" aria-hidden />}
        />
      </Card>
    );
  }

  const overall = data?.overall;

  return (
    <div className="space-y-5">
      {/* Overall summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wide text-foreground-muted">
            {t('studentCabinet.performance.overallAverage')}
          </span>
          <span className="text-2xl font-semibold text-foreground">
            {formatAverage(overall?.averageGrade ?? 0)}
          </span>
        </Card>
        <Card className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wide text-foreground-muted">
            {t('studentCabinet.performance.totalAbsences')}
          </span>
          <span className="text-2xl font-semibold text-foreground">
            {overall?.totalAbsences ?? 0}
          </span>
        </Card>
        <Card className="col-span-2 flex flex-col gap-1 sm:col-span-1">
          <span className="text-xs uppercase tracking-wide text-foreground-muted">
            {t('studentCabinet.performance.subjectsCount')}
          </span>
          <span className="text-2xl font-semibold text-foreground">
            {rows.length}
          </span>
        </Card>
      </div>

      {/* Averages chart */}
      <Card>
        <div className="mb-3 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" aria-hidden />
          <h3 className="text-sm font-semibold text-foreground">
            {t('studentCabinet.performance.chartTitle')}
          </h3>
        </div>
        <PerformanceChart bySubject={rows} />
      </Card>

      {/* Per-subject breakdown: table (sm+) / cards (mobile) */}
      <Card flush className="overflow-hidden">
        {/* Desktop table */}
        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-foreground-muted">
                <th className="px-4 py-3 font-medium">
                  {t('studentCabinet.performance.subject')}
                </th>
                <th className="px-4 py-3 text-center font-medium">
                  {t('studentCabinet.performance.average')}
                </th>
                <th className="px-4 py-3 text-center font-medium">
                  {t('studentCabinet.performance.grades')}
                </th>
                <th className="px-4 py-3 text-center font-medium">
                  {t('studentCabinet.performance.present')}
                </th>
                <th className="px-4 py-3 text-center font-medium">
                  {t('studentCabinet.performance.lates')}
                </th>
                <th className="px-4 py-3 text-center font-medium">
                  {t('studentCabinet.performance.absences')}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.subjectId}
                  className="border-b border-border last:border-0"
                >
                  <td className="px-4 py-3 font-medium text-foreground">
                    {row.subjectName}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge
                      variant={gradeVariant(Math.round(row.averageGrade))}
                      className="justify-center"
                    >
                      {formatAverage(row.averageGrade)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-center text-foreground-muted">
                    {row.gradesCount}
                  </td>
                  <td className="px-4 py-3 text-center text-success">
                    {row.present}
                  </td>
                  <td className="px-4 py-3 text-center text-foreground-muted">
                    {row.lates}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={
                        row.absences > 0
                          ? 'font-medium text-danger'
                          : 'text-foreground-muted'
                      }
                    >
                      {row.absences}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile stacked cards */}
        <ul className="divide-y divide-border sm:hidden">
          {rows.map((row) => (
            <li key={row.subjectId} className="p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="min-w-0 truncate font-medium text-foreground">
                  {row.subjectName}
                </span>
                <Badge
                  variant={gradeVariant(Math.round(row.averageGrade))}
                  className="justify-center"
                >
                  {formatAverage(row.averageGrade)}
                </Badge>
              </div>
              <dl className="grid grid-cols-2 gap-2 text-center text-xs sm:grid-cols-4">
                <div>
                  <dt className="text-foreground-muted">
                    {t('studentCabinet.performance.grades')}
                  </dt>
                  <dd className="mt-0.5 font-medium text-foreground">
                    {row.gradesCount}
                  </dd>
                </div>
                <div>
                  <dt className="text-foreground-muted">
                    {t('studentCabinet.performance.present')}
                  </dt>
                  <dd className="mt-0.5 font-medium text-success">
                    {row.present}
                  </dd>
                </div>
                <div>
                  <dt className="text-foreground-muted">
                    {t('studentCabinet.performance.lates')}
                  </dt>
                  <dd className="mt-0.5 font-medium text-foreground">
                    {row.lates}
                  </dd>
                </div>
                <div>
                  <dt className="text-foreground-muted">
                    {t('studentCabinet.performance.absences')}
                  </dt>
                  <dd
                    className={
                      row.absences > 0
                        ? 'mt-0.5 font-medium text-danger'
                        : 'mt-0.5 font-medium text-foreground'
                    }
                  >
                    {row.absences}
                  </dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
