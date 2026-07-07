import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Info, Wallet } from 'lucide-react';

import {
  PageHeader,
  Input,
  DataTable,
  Badge,
  type DataTableColumn,
} from '@/shared/ui';
import { formatMoney, toNumber, todayInput } from '@/shared/lib';
import { useSalaryOverview, type SalaryOverviewRow } from '@/entities/salary';

/** Hours with up to 2 decimals, grouped like the money helpers (ru-RU). */
const hoursFormat = new Intl.NumberFormat('ru-RU', {
  maximumFractionDigits: 2,
});

/** First day of the current month as a local `YYYY-MM-DD` input value. */
function firstOfMonthInput(): string {
  return `${todayInput().slice(0, 8)}01`;
}

/**
 * Salaries page (FOUNDER only): automatic per-period salary overview for all
 * staff — teachers (hourly rate × conducted hours) and employees — built on
 * GET /finance/salaries/overview via useSalaryOverview(from, to).
 */
export function SalariesPage() {
  const { t } = useTranslation();

  const [from, setFrom] = useState(firstOfMonthInput);
  const [to, setTo] = useState(todayInput);

  const { data, isLoading, isError } = useSalaryOverview(from, to);

  const rows = useMemo(() => data ?? [], [data]);
  const totalAmount = useMemo(
    () => rows.reduce((sum, r) => sum + toNumber(r.amount), 0),
    [rows],
  );

  const fullName = (r: SalaryOverviewRow) =>
    [r.lastName, r.firstName].filter(Boolean).join(' ');

  const columns: DataTableColumn<SalaryOverviewRow>[] = [
    {
      id: 'kind',
      header: t('finance.records.type'),
      sortValue: (r) => r.kind,
      cell: (r) =>
        r.kind === 'teacher' ? (
          <Badge variant="primary">{t('salaries.teacherKind')}</Badge>
        ) : (
          <Badge variant="muted">{t('salaries.employeeKind')}</Badge>
        ),
    },
    {
      id: 'name',
      header: `${t('fields.lastName')} / ${t('fields.firstName')}`,
      mobileLabel: t('fields.firstName'),
      sortValue: (r) => fullName(r),
      cell: (r) => (
        <span className="font-medium text-foreground">{fullName(r)}</span>
      ),
    },
    {
      id: 'branch',
      header: t('fields.branch'),
      sortValue: (r) => r.branch?.name ?? null,
      cell: (r) => r.branch?.name ?? '—',
    },
    {
      id: 'rate',
      header: t('salaries.rate'),
      sortValue: (r) => (r.hourlyRate == null ? null : toNumber(r.hourlyRate)),
      cell: (r) =>
        r.hourlyRate == null ? (
          <span className="text-foreground-muted">{t('salaries.noRate')}</span>
        ) : (
          <span className="tabular-nums">{formatMoney(r.hourlyRate)}</span>
        ),
    },
    {
      id: 'lessons',
      header: t('salaries.lessons'),
      sortValue: (r) => r.lessonsCount,
      cell: (r) => <span className="tabular-nums">{r.lessonsCount}</span>,
    },
    {
      id: 'hours',
      header: t('salaries.hours'),
      sortValue: (r) => r.hoursTotal,
      cell: (r) => (
        <span className="tabular-nums">{hoursFormat.format(r.hoursTotal)}</span>
      ),
    },
    {
      id: 'amount',
      header: t('salaries.amount'),
      headerClassName: 'text-right',
      className: 'text-right',
      sortValue: (r) => toNumber(r.amount),
      cell: (r) => (
        <span className="font-semibold tabular-nums text-foreground">
          {formatMoney(r.amount)}
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={t('salaries.title')}
        description={t('salaries.subtitle')}
      />

      <div className="space-y-4">
        {/* How the numbers are computed */}
        <p className="flex items-start gap-2 text-sm text-foreground-muted">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{t('salaries.hint')}</span>
        </p>

        {/* Period picker */}
        <section aria-label={t('salaries.period')}>
          <h2 className="text-sm font-medium text-foreground">
            {t('salaries.period')}
          </h2>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <div className="sm:w-44">
              <Input
                label={t('finance.filters.from')}
                type="date"
                value={from}
                max={to || undefined}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div className="sm:w-44">
              <Input
                label={t('finance.filters.to')}
                type="date"
                value={to}
                min={from || undefined}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
          </div>
        </section>

        <DataTable
          columns={columns}
          data={rows}
          rowKey={(r) => `${r.kind}-${r.id}`}
          loading={isLoading}
          skeletonRows={6}
          emptyIcon={<Wallet className="h-6 w-6" aria-hidden />}
          emptyTitle={isError ? t('crud.loadError') : t('salaries.empty')}
          emptyDescription={isError ? undefined : t('salaries.emptyHint')}
        />

        {/* Totals */}
        {!isLoading && rows.length > 0 && (
          <div className="flex flex-col gap-1 rounded-xl border border-border bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm font-medium text-foreground-muted">
              {t('salaries.total')}
            </span>
            <span className="text-lg font-semibold tabular-nums text-foreground">
              {formatMoney(totalAmount)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
