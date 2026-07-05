import { useTranslation } from 'react-i18next';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

import type { BranchTotals } from '@/entities/analytics';
import { formatMoneyShort } from '@/shared/lib';
import { CHART_COLORS } from '../lib/chartColors';
import { MoneyTooltip } from './ChartTooltip';
import { ChartFrame } from './ChartFrame';

export interface BranchBarChartProps {
  data: BranchTotals[];
  loading?: boolean;
}

/**
 * Grouped bar chart comparing income / expense / debt per branch. Horizontally
 * scrollable on narrow screens via ChartFrame's min-width wrapper so bars stay
 * legible at 320px.
 */
export function BranchBarChart({ data, loading }: BranchBarChartProps) {
  const { t } = useTranslation();

  const chartData = data.map((b) => ({
    name: b.branchName,
    income: b.income,
    expense: b.expense,
    debt: b.debt,
  }));

  return (
    <ChartFrame
      title={t('finance.overview.byBranch')}
      loading={loading}
      empty={chartData.length === 0}
      emptyLabel={t('finance.overview.noData')}
      /* Widen with the number of branches so grouped bars never crush. */
      minWidth={Math.max(360, chartData.length * 140)}
    >
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={chartData}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
          barGap={2}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="currentColor"
            className="text-border"
          />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 12 }}
            stroke="currentColor"
            className="text-foreground-muted"
          />
          <YAxis
            width={64}
            tick={{ fontSize: 11 }}
            tickFormatter={(v) => formatMoneyShort(v)}
            stroke="currentColor"
            className="text-foreground-muted"
          />
          <Tooltip
            content={<MoneyTooltip />}
            cursor={{ fill: 'rgba(37, 99, 235, 0.06)' }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar
            dataKey="income"
            name={t('finance.overview.income')}
            fill={CHART_COLORS.income}
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="expense"
            name={t('finance.overview.expense')}
            fill={CHART_COLORS.expense}
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="debt"
            name={t('finance.overview.debt')}
            fill={CHART_COLORS.debt}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
