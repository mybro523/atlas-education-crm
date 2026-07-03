import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { useThemeStore } from '@/shared/lib/theme';
import type { MyPerformance } from '@/entities/me';

export interface PerformanceChartProps {
  /** Per-subject performance rows from `/me/student/performance`. */
  bySubject: MyPerformance['bySubject'];
}

interface ChartDatum {
  subjectId: string;
  /** Truncated label used on the axis. */
  label: string;
  /** Full subject name used in the tooltip. */
  fullLabel: string;
  average: number;
}

/** Brand purple scale (fixed, matches tailwind.config brand.*). */
const BAR_LIGHT = '#7c3aed';
const BAR_DARK = '#a78bfa';

function truncate(value: string, max = 12): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

/**
 * Responsive bar chart of average grade (2..5) per subject.
 * Theme-aware colors; fills its parent width and a fixed responsive height.
 */
export function PerformanceChart({ bySubject }: PerformanceChartProps) {
  const { t } = useTranslation();
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === 'dark';

  const barColor = isDark ? BAR_DARK : BAR_LIGHT;
  const axisColor = isDark ? '#a1a1aa' : '#71717a';
  const gridColor = isDark ? 'rgba(161,161,170,0.18)' : 'rgba(113,113,122,0.16)';

  const data = useMemo<ChartDatum[]>(
    () =>
      bySubject.map((row) => ({
        subjectId: row.subjectId,
        label: truncate(row.subjectName),
        fullLabel: row.subjectName,
        average: Number(row.averageGrade?.toFixed(2) ?? 0),
      })),
    [bySubject],
  );

  return (
    <div className="h-64 w-full sm:h-72" aria-hidden>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 8, right: 8, left: -16, bottom: 4 }}
          barCategoryGap="24%"
        >
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: axisColor, fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: gridColor }}
            interval={0}
            angle={-20}
            textAnchor="end"
            height={48}
          />
          <YAxis
            domain={[0, 5]}
            ticks={[0, 1, 2, 3, 4, 5]}
            tick={{ fill: axisColor, fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: gridColor }}
            width={28}
          />
          <Tooltip
            cursor={{ fill: isDark ? 'rgba(167,139,250,0.10)' : 'rgba(124,58,237,0.08)' }}
            contentStyle={{
              backgroundColor: isDark ? '#18181b' : '#ffffff',
              border: `1px solid ${gridColor}`,
              borderRadius: 12,
              fontSize: 12,
              color: isDark ? '#f4f4f5' : '#18181b',
            }}
            labelStyle={{ color: isDark ? '#f4f4f5' : '#18181b', fontWeight: 600 }}
            formatter={(value: number) => [
              value.toFixed(2),
              t('studentCabinet.performance.averageGrade'),
            ]}
            labelFormatter={(_label, payload) =>
              payload?.[0]?.payload?.fullLabel ?? _label
            }
          />
          <Bar dataKey="average" radius={[6, 6, 0, 0]} maxBarSize={56}>
            {data.map((d) => (
              <Cell key={d.subjectId} fill={barColor} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
