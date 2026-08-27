import { useTranslation } from 'react-i18next';

import { Skeleton } from '@/shared/ui';
import { formatMoney, formatMoneyShort } from '@/shared/lib/format';

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
 * Dependency-free monthly income-vs-expense mini chart, styled pseudo-3D:
 * vertical light→saturated gradients with a glossy inner shine, colored glow
 * shadows, staggered grow-from-baseline entrance, hover lift + brighter glow,
 * and a frosted-glass tooltip per month. Still zero chart libraries, so the
 * dashboard chunk stays light. Reads from 320px; fully themed light + dark.
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

  const incomeLabel = t('finance.overview.income');
  const expenseLabel = t('finance.overview.expense');

  return (
    <div>
      {/* Legend */}
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-foreground-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)] dark:bg-emerald-400" />
          {incomeLabel}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.8)] dark:bg-rose-400" />
          {expenseLabel}
        </span>
      </div>

      {/* Bars — columns stretch to the fixed height so % bars resolve. */}
      <div className="flex h-40 gap-1.5 sm:gap-3">
        {data.map((d, monthIndex) => (
          <div
            key={d.label}
            className="group relative flex min-w-0 flex-1 flex-col gap-1"
          >
            {/* Frosted-glass tooltip for the hovered month. */}
            <div
              className="pointer-events-none absolute bottom-full left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-xl border border-border/70 bg-surface/85 px-3 py-2 text-xs shadow-elevated backdrop-blur-md group-hover:block group-hover:animate-tooltip-pop"
              role="tooltip"
            >
              <p className="mb-1 font-semibold text-foreground">{d.label}</p>
              <p className="flex items-center gap-1.5 text-foreground">
                <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.8)]" />
                <span className="text-foreground-muted">{incomeLabel}:</span>
                <span className="font-semibold tabular-nums">
                  {formatMoney(d.income)}
                </span>
              </p>
              <p className="mt-0.5 flex items-center gap-1.5 text-foreground">
                <span className="h-2 w-2 rounded-full bg-rose-500 shadow-[0_0_5px_rgba(244,63,94,0.8)]" />
                <span className="text-foreground-muted">{expenseLabel}:</span>
                <span className="font-semibold tabular-nums">
                  {formatMoney(d.expense)}
                </span>
              </p>
            </div>

            <div className="flex min-h-0 flex-1 items-end justify-center gap-0.5 sm:gap-1">
              {/* Income bar: light-top gradient + inner shine + green glow. */}
              <div
                className="relative w-full max-w-[16px] origin-bottom animate-bar-grow overflow-hidden rounded-t-[5px] bg-gradient-to-b from-emerald-300 via-emerald-500 to-emerald-600 shadow-[0_2px_10px_rgba(16,185,129,0.45)] transition-all duration-200 group-hover:-translate-y-0.5 group-hover:brightness-110 group-hover:shadow-[0_4px_16px_rgba(16,185,129,0.65)] dark:from-emerald-300 dark:via-emerald-400 dark:to-emerald-600"
                style={{
                  height: height(d.income),
                  animationDelay: `${monthIndex * 70}ms`,
                }}
                title={`${incomeLabel}: ${formatMoneyShort(d.income)}`}
                aria-hidden
              >
                {/* Glossy left-edge shine strip — the pseudo-3D highlight. */}
                <span className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-white/45 to-transparent" />
              </div>
              {/* Expense bar: same treatment in rose. */}
              <div
                className="relative w-full max-w-[16px] origin-bottom animate-bar-grow overflow-hidden rounded-t-[5px] bg-gradient-to-b from-rose-300 via-rose-500 to-rose-600 shadow-[0_2px_10px_rgba(244,63,94,0.45)] transition-all duration-200 group-hover:-translate-y-0.5 group-hover:brightness-110 group-hover:shadow-[0_4px_16px_rgba(244,63,94,0.65)] dark:from-rose-300 dark:via-rose-400 dark:to-rose-600"
                style={{
                  height: height(d.expense),
                  animationDelay: `${monthIndex * 70 + 35}ms`,
                }}
                title={`${expenseLabel}: ${formatMoneyShort(d.expense)}`}
                aria-hidden
              >
                <span className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-white/45 to-transparent" />
              </div>
            </div>
            <span className="w-full shrink-0 truncate text-center text-[10px] leading-none text-foreground-muted transition-colors group-hover:text-foreground sm:text-xs">
              {d.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
