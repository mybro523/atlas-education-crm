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
import { CHART_COLORS, CHART_COLORS_LIGHT } from '../lib/chartColors';
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

const METRIC_COLOR_LIGHT: Record<AnalyticsMetric, string> = {
  income: CHART_COLORS_LIGHT.income,
  expense: CHART_COLORS_LIGHT.expense,
  debt: CHART_COLORS_LIGHT.debt,
  net: CHART_COLORS_LIGHT.net,
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
  const lightColor = METRIC_COLOR_LIGHT[metric];
  const gradientId = `series-fill-${metric}`;
  const strokeGradientId = `series-stroke-${metric}`;
  const glowId = `series-glow-${metric}`;
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
              <stop offset="0%" stopColor={lightColor} stopOpacity={0.5} />
              <stop offset="45%" stopColor={color} stopOpacity={0.22} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id={strokeGradientId} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={color} />
              <stop offset="50%" stopColor={lightColor} />
              <stop offset="100%" stopColor={color} />
            </linearGradient>
            {/* Soft glow that makes the line float above the fill. */}
            <filter id={glowId} x="-20%" y="-40%" width="140%" height="180%">
              <feDropShadow
                dx="0"
                dy="2"
                stdDeviation="4"
                floodColor={color}
                floodOpacity="0.45"
              />
            </filter>
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
            stroke={`url(#${strokeGradientId})`}
            strokeWidth={3}
            strokeLinecap="round"
            fill={`url(#${gradientId})`}
            filter={`url(#${glowId})`}
            animationDuration={1100}
            animationEasing="ease-out"
            dot={{ r: 3, fill: color, strokeWidth: 0 }}
            activeDot={{
              r: 6,
              fill: lightColor,
              stroke: color,
              strokeWidth: 2,
              className: 'animate-pulse',
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
