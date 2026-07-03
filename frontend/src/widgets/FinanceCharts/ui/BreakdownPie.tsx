import { useTranslation } from 'react-i18next';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

import { BREAKDOWN_COLORS } from '../lib/chartColors';
import { MoneyTooltip } from './ChartTooltip';
import { ChartFrame } from './ChartFrame';

export interface BreakdownPieProps {
  income: number;
  expense: number;
  debt: number;
  loading?: boolean;
}

/**
 * Income / expense / debt composition as a donut. Hidden entirely when every
 * slice is zero (nothing meaningful to draw).
 */
export function BreakdownPie({
  income,
  expense,
  debt,
  loading,
}: BreakdownPieProps) {
  const { t } = useTranslation();

  const data = [
    { name: t('finance.overview.income'), value: income },
    { name: t('finance.overview.expense'), value: expense },
    { name: t('finance.overview.debt'), value: debt },
  ].filter((d) => d.value > 0);

  return (
    <ChartFrame
      title={t('finance.overview.breakdown')}
      loading={loading}
      empty={data.length === 0}
      emptyLabel={t('finance.overview.noData')}
    >
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={95}
            paddingAngle={2}
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell
                key={entry.name}
                fill={BREAKDOWN_COLORS[index % BREAKDOWN_COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip content={<MoneyTooltip />} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
