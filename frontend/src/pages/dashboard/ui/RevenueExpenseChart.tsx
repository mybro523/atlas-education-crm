import { useTranslation } from 'react-i18next';

import { Skeleton } from '@/shared/ui';
import { formatMoneyShort } from '@/shared/lib/format';

export interface RevenueExpensePoint {
  /** Short bucket label, e.g. "Jul". */
  label: string;
  income: number;
  expense: number;
}

export interface RevenueExpenseChartProps {
  data: RevenueExpensePoint[];
  loading?: boolean;
}

/**
 * Dependency-free monthly income-vs-expense mini chart (grouped bars).
 * Two accessible hues paired with a text legend (never color-only), scaled to
 * the period max. Reads flawlessly from 320px; fully themed for light + dark.
 */
export function RevenueExpenseChart({
  data,
  loading = false,
}: RevenueExpenseChartProps) {
  const { t } = useTranslation();

  if (loading) {
    return <Skeleton className="h-44 w-full" />;
  }

  const max = Math.max(
    1,
    ...data.map((d) => d.income),
    ...data.map((d) => d.expense),
  );
  const hasData = data.some((d) => d.income > 0 || d.expense > 0);

  if (!hasData) {
    return (
      <div className="flex h-44 items-center justify-center text-sm text-foreground-muted">
        {t('finance.overview.noData')}
      </div>
    );
  }

  // Scale to the period max; keep a thin sliver so empty months stay legible.
  const height = (v: number) =>
    v <= 0 ? '2%' : `${Math.max(4, Math.round((v / max) * 100))}%`;

  return (
    <div>
      {/* Legend */}
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-foreground-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500 dark:bg-emerald-400" />
          {t('finance.overview.income')}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-rose-500 dark:bg-rose-400" />
          {t('finance.overview.expense')}
        </span>
      </div>

      {/* Bars — columns stretch to the fixed height so % bars resolve. */}
      <div className="flex h-40 gap-1.5 sm:gap-3">
        {data.map((d) => (
          <div key={d.label} className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex min-h-0 flex-1 items-end justify-center gap-0.5 sm:gap-1">
              <div
                className="w-full max-w-[16px] rounded-t-sm bg-emerald-500 transition-[height] duration-500 dark:bg-emerald-400"
                style={{ height: height(d.income) }}
                title={`${t('finance.overview.income')}: ${formatMoneyShort(d.income)}`}
                aria-hidden
              />
              <div
                className="w-full max-w-[16px] rounded-t-sm bg-rose-500 transition-[height] duration-500 dark:bg-rose-400"
                style={{ height: height(d.expense) }}
                title={`${t('finance.overview.expense')}: ${formatMoneyShort(d.expense)}`}
                aria-hidden
              />
            </div>
            <span className="w-full shrink-0 truncate text-center text-[10px] leading-none text-foreground-muted sm:text-xs">
              {d.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
