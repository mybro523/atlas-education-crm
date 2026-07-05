import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Users,
  GraduationCap,
  Boxes,
  Banknote,
  AlertTriangle,
  Wallet,
} from 'lucide-react';

import { Card } from '@/shared/ui';
import { formatMoney, toNumber } from '@/shared/lib/format';
import { useStudents } from '@/entities/student';
import { useTeachers } from '@/entities/teacher';
import { useGroups } from '@/entities/group';
import { useSalaries } from '@/entities/salary';
import { useAnalyticsSummary, useAnalyticsSeries } from '@/entities/analytics';

import { KpiCard } from './KpiCard';
import {
  RevenueExpenseChart,
  type RevenueExpensePoint,
} from './RevenueExpenseChart';

const pad2 = (n: number) => String(n).padStart(2, '0');
const formatCount = (n?: number) => (n ?? 0).toLocaleString();

/**
 * FOUNDER-only landing overview: six KPI tiles (students / teachers / groups /
 * this-month income / outstanding debts / salaries payable) plus a monthly
 * income-vs-expense mini chart. Every data source is FOUNDER-scoped, so this is
 * only ever mounted for founders (other roles keep the plain quick-links view).
 */
export function FounderOverview() {
  const { t } = useTranslation();

  // Date ranges: the current month (for income) and the trailing 6 months
  // (for the chart). Bucket keys are computed in UTC to match the API.
  const ranges = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );
    const months: Array<{ key: string; label: string }> = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1),
      );
      months.push({
        key: `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}`,
        label: d.toLocaleDateString(undefined, { month: 'short' }),
      });
    }
    const seriesFrom = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1),
    );
    return {
      monthFrom: monthStart.toISOString(),
      monthTo: monthEnd.toISOString(),
      seriesFrom: seriesFrom.toISOString(),
      seriesTo: monthEnd.toISOString(),
      months,
    };
  }, []);

  // --- Entity counts (pageSize 1 → read the total from the envelope meta). ---
  const students = useStudents({ page: 1, pageSize: 1 });
  const teachers = useTeachers({ page: 1, pageSize: 1 });
  const groups = useGroups({ page: 1, pageSize: 1 });

  // --- Finance ---
  const monthSummary = useAnalyticsSummary({
    from: ranges.monthFrom,
    to: ranges.monthTo,
  });
  const totalSummary = useAnalyticsSummary(); // debt outstanding as of now
  const pendingSalaries = useSalaries({
    status: 'PENDING',
    page: 1,
    pageSize: 100,
  });
  const incomeSeries = useAnalyticsSeries({
    metric: 'income',
    groupBy: 'month',
    from: ranges.seriesFrom,
    to: ranges.seriesTo,
  });
  const expenseSeries = useAnalyticsSeries({
    metric: 'expense',
    groupBy: 'month',
    from: ranges.seriesFrom,
    to: ranges.seriesTo,
  });

  const salariesPayable = useMemo(
    () =>
      (pendingSalaries.data?.items ?? []).reduce(
        (sum, row) => sum + toNumber(row.amount),
        0,
      ),
    [pendingSalaries.data],
  );
  const pendingCount = pendingSalaries.data?.meta.total ?? 0;

  const chartData = useMemo<RevenueExpensePoint[]>(() => {
    const inc = new Map(
      (incomeSeries.data?.combined ?? []).map((p) => [p.bucket, p.value]),
    );
    const exp = new Map(
      (expenseSeries.data?.combined ?? []).map((p) => [p.bucket, p.value]),
    );
    return ranges.months.map((m) => ({
      label: m.label,
      income: inc.get(m.key) ?? 0,
      expense: exp.get(m.key) ?? 0,
    }));
  }, [incomeSeries.data, expenseSeries.data, ranges.months]);

  return (
    <section className="space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground-muted">
        {t('dashboard.founder.kpiTitle')}
      </h2>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 2xl:grid-cols-6">
        <KpiCard
          icon={Users}
          label={t('dashboard.founder.totalStudents')}
          value={formatCount(students.data?.meta.total)}
          loading={students.isLoading}
          accent="bg-brand-100 text-brand-700 dark:bg-brand-600/20 dark:text-brand-300"
        />
        <KpiCard
          icon={GraduationCap}
          label={t('dashboard.founder.totalTeachers')}
          value={formatCount(teachers.data?.meta.total)}
          loading={teachers.isLoading}
          accent="bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
        />
        <KpiCard
          icon={Boxes}
          label={t('dashboard.founder.totalGroups')}
          value={formatCount(groups.data?.meta.total)}
          loading={groups.isLoading}
          accent="bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300"
        />
        <KpiCard
          icon={Banknote}
          label={t('dashboard.founder.monthIncome')}
          value={formatMoney(monthSummary.data?.combined.income ?? 0)}
          sub={t('dashboard.founder.thisMonth')}
          loading={monthSummary.isLoading}
          accent="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
        />
        <KpiCard
          icon={AlertTriangle}
          label={t('dashboard.founder.outstandingDebt')}
          value={formatMoney(totalSummary.data?.combined.debt ?? 0)}
          sub={t('dashboard.founder.asOfToday')}
          loading={totalSummary.isLoading}
          accent="bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300"
        />
        <KpiCard
          icon={Wallet}
          label={t('dashboard.founder.salariesPayable')}
          value={formatMoney(salariesPayable)}
          sub={t('dashboard.founder.pendingCount', { count: pendingCount })}
          loading={pendingSalaries.isLoading}
          accent="bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
        />
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">
            {t('dashboard.founder.chartTitle')}
          </h3>
          <span className="text-xs text-foreground-muted">
            {t('dashboard.founder.chartSubtitle')}
          </span>
        </div>
        <RevenueExpenseChart
          data={chartData}
          loading={incomeSeries.isLoading || expenseSeries.isLoading}
        />
      </Card>
    </section>
  );
}
