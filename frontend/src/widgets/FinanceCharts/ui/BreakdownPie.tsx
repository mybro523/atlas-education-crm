import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  PieChart,
  Pie,
  Cell,
  Sector,
  Tooltip,
  ResponsiveContainer,
  type SectorProps,
} from 'recharts';

import { AnimatedNumber } from '@/shared/ui';
import { formatMoneyShort } from '@/shared/lib';
import {
  CHART_COLORS,
  CHART_COLORS_DARK,
  CHART_SHADOW_ID,
  metricGradientId,
} from '../lib/chartColors';
import { MoneyTooltip } from './ChartTooltip';
import { ChartFrame } from './ChartFrame';
import { renderChartDefs } from './ChartDefs';

export interface BreakdownPieProps {
  income: number;
  expense: number;
  debt: number;
  loading?: boolean;
}

type MetricKey = 'income' | 'expense' | 'debt';

/** Hovered slice: same sector, pushed outward with a deeper shadow — the
 * "lifted piece of pie" effect. */
function renderActiveSlice(props: SectorProps) {
  const { outerRadius = 0, ...rest } = props;
  return (
    <g filter={`url(#${CHART_SHADOW_ID})`}>
      <Sector {...rest} outerRadius={outerRadius + 8} />
    </g>
  );
}

/**
 * Income / expense / debt composition as a pseudo-3D donut: gradient slices
 * over a darker base ring (depth rim), rounded corners, a spin-in sweep
 * animation, hover "lift" for the active slice, and the animated grand total
 * in the hole. Hidden entirely when every slice is zero.
 */
export function BreakdownPie({
  income,
  expense,
  debt,
  loading,
}: BreakdownPieProps) {
  const { t } = useTranslation();
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);

  const data = (
    [
      { key: 'income', name: t('finance.overview.income'), value: income },
      { key: 'expense', name: t('finance.overview.expense'), value: expense },
      { key: 'debt', name: t('finance.overview.debt'), value: debt },
    ] satisfies Array<{ key: MetricKey; name: string; value: number }>
  ).filter((d) => d.value > 0);

  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <ChartFrame
      title={t('finance.overview.breakdown')}
      loading={loading}
      empty={data.length === 0}
      emptyLabel={t('finance.overview.noData')}
    >
      <div className="relative">
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            {renderChartDefs()}
            {/* Depth rim: a slightly wider, darker ring behind the main donut
                gives the flat SVG a bevelled 3D edge. Not interactive. */}
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={58}
              outerRadius={99}
              paddingAngle={3}
              stroke="none"
              isAnimationActive={false}
              legendType="none"
              tooltipType="none"
            >
              {data.map((entry) => (
                <Cell
                  key={`rim-${entry.key}`}
                  fill={CHART_COLORS_DARK[entry.key]}
                  opacity={0.9}
                />
              ))}
            </Pie>
            {/* Main gradient donut with hover lift. */}
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={62}
              outerRadius={95}
              paddingAngle={3}
              cornerRadius={6}
              stroke="none"
              animationDuration={1100}
              animationEasing="ease-out"
              filter={`url(#${CHART_SHADOW_ID})`}
              activeIndex={activeIndex}
              activeShape={renderActiveSlice}
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(undefined)}
            >
              {data.map((entry) => (
                <Cell
                  key={entry.key}
                  fill={`url(#${metricGradientId(entry.key)})`}
                />
              ))}
            </Pie>
            <Tooltip content={<MoneyTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        {/* Animated grand total in the donut hole (covers the 280px chart area
            only, so the legend below doesn't skew the centering). */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 flex h-[280px] flex-col items-center justify-center"
          aria-hidden
        >
          <span className="text-[11px] font-medium uppercase tracking-wide text-foreground-muted">
            {t('finance.overview.total')}
          </span>
          <span className="text-lg font-bold text-foreground">
            <AnimatedNumber value={total} format={(n) => formatMoneyShort(n)} />
          </span>
        </div>
        {/* Own legend: the recharts one would double every entry because the
            depth-rim Pie contributes its slices to the shared legend payload. */}
        <div className="mt-1 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-foreground-muted">
          {data.map((d) => (
            <span key={d.key} className="inline-flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{
                  backgroundColor: CHART_COLORS[d.key],
                  boxShadow: `0 0 5px ${CHART_COLORS[d.key]}`,
                }}
              />
              {d.name}
            </span>
          ))}
        </div>
      </div>
    </ChartFrame>
  );
}
