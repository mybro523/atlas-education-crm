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
import { CHART_SHADOW_ID, metricGradientId } from '../lib/chartColors';
import { MoneyTooltip } from './ChartTooltip';
import { ChartFrame } from './ChartFrame';
import { renderChartDefs } from './ChartDefs';

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
          barGap={4}
        >
          {renderChartDefs()}
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="currentColor"
            className="text-border"
            vertical={false}
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
            cursor={{ fill: 'rgba(37, 99, 235, 0.06)', radius: 8 }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={9} />
          <Bar
            dataKey="income"
            name={t('finance.overview.income')}
            fill={`url(#${metricGradientId('income')})`}
            radius={[7, 7, 0, 0]}
            filter={`url(#${CHART_SHADOW_ID})`}
            animationDuration={900}
            animationEasing="ease-out"
            activeBar={{ filter: `url(#${CHART_SHADOW_ID})`, opacity: 0.85 }}
          />
          <Bar
            dataKey="expense"
            name={t('finance.overview.expense')}
            fill={`url(#${metricGradientId('expense')})`}
            radius={[7, 7, 0, 0]}
            filter={`url(#${CHART_SHADOW_ID})`}
            animationDuration={900}
            animationBegin={120}
            animationEasing="ease-out"
            activeBar={{ filter: `url(#${CHART_SHADOW_ID})`, opacity: 0.85 }}
          />
          <Bar
            dataKey="debt"
            name={t('finance.overview.debt')}
            fill={`url(#${metricGradientId('debt')})`}
            radius={[7, 7, 0, 0]}
            filter={`url(#${CHART_SHADOW_ID})`}
            animationDuration={900}
            animationBegin={240}
            animationEasing="ease-out"
            activeBar={{ filter: `url(#${CHART_SHADOW_ID})`, opacity: 0.85 }}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
