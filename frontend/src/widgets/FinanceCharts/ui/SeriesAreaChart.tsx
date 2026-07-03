import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

import type { AnalyticsMetric, SeriesPoint } from '@/entities/analytics';
import { formatMoneyShort } from '@/shared/lib';
import { CHART_COLORS } from '../lib/chartColors';
import { MoneyTooltip } from './ChartTooltip';
import { ChartFrame } from './ChartFrame';

export interface SeriesAreaChartProps {
  title: string;
  points: SeriesPoint[];
  metric: AnalyticsMetric;
  metricLabel: string;
  loading?: boolean;
  emptyLabel?: string;
}

const METRIC_COLOR: Record<AnalyticsMetric, string> = {
  income: CHART_COLORS.income,
  expense: CHART_COLORS.expense,
  debt: CHART_COLORS.debt,
  net: CHART_COLORS.net,
};

/**
 * Time-series area chart for a single metric (income/expense/debt/net) bucketed
 * by day/week/month. Fills with the metric's semantic color.
 */
export function SeriesAreaChart({
  title,
  points,
  metric,
  metricLabel,
  loading,
  emptyLabel,
}: SeriesAreaChartProps) {
  const color = METRIC_COLOR[metric];
  const gradientId = `series-fill-${metric}`;
  const data = points.map((p) => ({ bucket: p.bucket, value: p.value }));

  return (
    <ChartFrame
      title={title}
      loading={loading}
      empty={data.length === 0}
      emptyLabel={emptyLabel}
      minWidth={Math.max(360, data.length * 56)}
    >
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="currentColor"
            className="text-border"
          />
          <XAxis
            dataKey="bucket"
            tick={{ fontSize: 11 }}
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
          <Tooltip content={<MoneyTooltip />} />
          <Area
            type="monotone"
            dataKey="value"
            name={metricLabel}
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            activeDot={{ r: 4 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
