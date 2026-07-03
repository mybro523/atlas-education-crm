import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Select } from '@/shared/ui';
import { useBranches } from '@/entities/branch';
import {
  useAnalyticsSummary,
  useAnalyticsSeries,
  type AnalyticsMetric,
} from '@/entities/analytics';
import {
  SummaryCards,
  BranchBarChart,
  BreakdownPie,
  SeriesAreaChart,
} from '@/widgets/FinanceCharts';
import { DateRangeFilter, type DateRange } from './DateRangeFilter';

const METRIC_OPTIONS: AnalyticsMetric[] = ['net', 'income', 'expense', 'debt'];
const GROUP_BY_OPTIONS = ['day', 'week', 'month'] as const;

/**
 * Founder finance overview: KPI totals + responsive recharts (per-branch bar,
 * income/expense/debt donut, and a metric time-series area) with from/to and
 * per-branch filters. All money TJS. Read-only (API_CONTRACT §15).
 */
export function OverviewView() {
  const { t } = useTranslation();

  const [range, setRange] = useState<DateRange>({ from: '', to: '' });
  const [branchId, setBranchId] = useState('');
  const [metric, setMetric] = useState<AnalyticsMetric>('net');
  const [groupBy, setGroupBy] =
    useState<(typeof GROUP_BY_OPTIONS)[number]>('month');

  const { data: branches } = useBranches();

  const summaryParams = useMemo(
    () => ({
      from: range.from || undefined,
      to: range.to || undefined,
      branchId: branchId || undefined,
    }),
    [range, branchId],
  );

  const seriesParams = useMemo(
    () => ({ ...summaryParams, metric, groupBy }),
    [summaryParams, metric, groupBy],
  );

  const { data: summary, isLoading: summaryLoading } =
    useAnalyticsSummary(summaryParams);
  const { data: series, isLoading: seriesLoading } =
    useAnalyticsSeries(seriesParams);

  const branchOptions = useMemo(
    () => [
      { value: '', label: t('finance.overview.allBranches') },
      ...(branches ?? []).map((b) => ({ value: b.id, label: b.name })),
    ],
    [branches, t],
  );

  const metricOptions = METRIC_OPTIONS.map((m) => ({
    value: m,
    label: t(`finance.overview.${m}`),
  }));
  const groupByOptions = GROUP_BY_OPTIONS.map((g) => ({
    value: g,
    label: t(`finance.overview.groupBy.${g}`),
  }));

  const combined = summary?.combined;

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <DateRangeFilter value={range} onChange={setRange} />
        <div className="sm:w-56">
          <Select
            label={t('fields.branch')}
            options={branchOptions}
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
          />
        </div>
      </div>

      <SummaryCards totals={combined} loading={summaryLoading} />

      {/* Bar (per branch) + breakdown donut */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <BranchBarChart
            data={summary?.byBranch ?? []}
            loading={summaryLoading}
          />
        </div>
        <BreakdownPie
          income={combined?.income ?? 0}
          expense={combined?.expense ?? 0}
          debt={combined?.debt ?? 0}
          loading={summaryLoading}
        />
      </div>

      {/* Time series */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-end">
        <div className="sm:w-44">
          <Select
            label={t('finance.overview.metric')}
            options={metricOptions}
            value={metric}
            onChange={(e) => setMetric(e.target.value as AnalyticsMetric)}
          />
        </div>
        <div className="sm:w-44">
          <Select
            label={t('finance.overview.groupByLabel')}
            options={groupByOptions}
            value={groupBy}
            onChange={(e) =>
              setGroupBy(e.target.value as (typeof GROUP_BY_OPTIONS)[number])
            }
          />
        </div>
      </div>

      <SeriesAreaChart
        title={t('finance.overview.trend')}
        points={series?.combined ?? []}
        metric={metric}
        metricLabel={t(`finance.overview.${metric}`)}
        loading={seriesLoading}
        emptyLabel={t('finance.overview.noData')}
      />
    </div>
  );
}
