import { useTranslation } from 'react-i18next';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  AlertCircle,
  type LucideIcon,
} from 'lucide-react';

import { Card, Skeleton } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { formatMoney } from '@/shared/lib';
import { CHART_COLORS } from '../lib/chartColors';

export interface SummaryTotals {
  income: number;
  expense: number;
  net: number;
  debt: number;
}

export interface SummaryCardsProps {
  totals?: SummaryTotals;
  loading?: boolean;
}

interface CardConfig {
  key: keyof SummaryTotals;
  labelKey: string;
  icon: LucideIcon;
  color: string;
  tint: string;
}

const CARDS: CardConfig[] = [
  {
    key: 'income',
    labelKey: 'finance.overview.income',
    icon: TrendingUp,
    color: CHART_COLORS.income,
    tint: 'bg-success/10 text-success',
  },
  {
    key: 'expense',
    labelKey: 'finance.overview.expense',
    icon: TrendingDown,
    color: CHART_COLORS.expense,
    tint: 'bg-danger/10 text-danger',
  },
  {
    key: 'net',
    labelKey: 'finance.overview.net',
    icon: Wallet,
    color: CHART_COLORS.net,
    tint: 'bg-brand-100 text-brand-700 dark:bg-brand-600/20 dark:text-brand-300',
  },
  {
    key: 'debt',
    labelKey: 'finance.overview.debt',
    icon: AlertCircle,
    color: CHART_COLORS.debt,
    tint: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  },
];

/**
 * Four KPI cards: income, expense, net, debt. Responsive grid — 1 col on
 * mobile, 2 cols from `sm`, 4 cols on desktop.
 */
export function SummaryCards({ totals, loading }: SummaryCardsProps) {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {CARDS.map((card) => {
        const Icon = card.icon;
        const value = totals?.[card.key] ?? 0;
        const isNegativeNet = card.key === 'net' && value < 0;
        return (
          <Card key={card.key} className="flex items-center gap-3">
            <div
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                card.tint,
              )}
            >
              <Icon className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium uppercase tracking-wide text-foreground-muted">
                {t(card.labelKey)}
              </p>
              {loading ? (
                <Skeleton variant="text" className="mt-1 h-5 w-24" />
              ) : (
                <p
                  className={cn(
                    'mt-0.5 truncate text-lg font-semibold tabular-nums',
                    isNegativeNet ? 'text-danger' : 'text-foreground',
                  )}
                  title={formatMoney(value)}
                >
                  {formatMoney(value)}
                </p>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
