import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, TrendingDown } from 'lucide-react';

import {
  Card,
  Select,
  Badge,
  DataTable,
  Skeleton,
  type DataTableColumn,
} from '@/shared/ui';
import { useBranches } from '@/entities/branch';
import { useDebts, type DebtsParams } from '@/entities/payment';
import { formatMoney } from '@/shared/lib';

interface DebtRow {
  studentId: string;
  studentName: string;
  branchId: string;
  unpaidPeriods: number;
  amountDue: number;
}

/**
 * Debts report (API_CONTRACT §12): unpaid, elapsed billing periods aggregated
 * per student, with a running total and an optional branch / as-of filter.
 */
export function DebtsView() {
  const { t } = useTranslation();

  const [branchId, setBranchId] = useState('');
  const [asOf, setAsOf] = useState('');

  const { data: branches } = useBranches();

  const params = useMemo<DebtsParams>(
    () => ({
      branchId: branchId || undefined,
      asOf: asOf || undefined,
    }),
    [branchId, asOf],
  );

  const { data, isLoading, isError } = useDebts(params);

  const branchName = (id: string) =>
    branches?.find((b) => b.id === id)?.name ?? '—';

  const rows: DebtRow[] = data?.byStudent ?? [];

  const columns: DataTableColumn<DebtRow>[] = [
    {
      id: 'student',
      header: t('finance.payments.student'),
      cell: (r) => (
        <span className="font-medium text-foreground">{r.studentName}</span>
      ),
    },
    {
      id: 'branch',
      header: t('fields.branch'),
      cell: (r) => branchName(r.branchId),
    },
    {
      id: 'periods',
      header: t('finance.debts.unpaidPeriods'),
      cell: (r) => (
        <Badge variant="warning">
          {t('finance.debts.periodsCount', { count: r.unpaidPeriods })}
        </Badge>
      ),
    },
    {
      id: 'amount',
      header: t('finance.debts.amountDue'),
      className: 'text-right',
      headerClassName: 'text-right',
      cell: (r) => (
        <span className="font-semibold tabular-nums text-danger">
          {formatMoney(r.amountDue)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Total banner + filters */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <Card className="flex items-center gap-3 lg:min-w-64">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-danger/10 text-danger">
            <TrendingDown className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-foreground-muted">
              {t('finance.debts.totalDebt')}
            </p>
            {isLoading ? (
              <Skeleton variant="text" className="mt-1 h-6 w-28" />
            ) : (
              <p className="text-xl font-semibold tabular-nums text-danger">
                {formatMoney(data?.totalDebt ?? 0)}
              </p>
            )}
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:w-56">
            <Select
              label={t('fields.branch')}
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              options={[
                { value: '', label: t('crud.allBranches') },
                ...(branches ?? []).map((b) => ({
                  value: b.id,
                  label: b.name,
                })),
              ]}
            />
          </div>
          <div className="sm:w-44">
            {/* Native date input inside a labelled Select-like block. */}
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              {t('finance.debts.asOf')}
            </label>
            <input
              type="date"
              value={asOf}
              onChange={(e) => setAsOf(e.target.value)}
              className="h-11 w-full rounded-lg border border-border bg-surface px-3.5 text-sm text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={rows}
        rowKey={(r) => r.studentId}
        loading={isLoading}
        emptyIcon={<AlertCircle className="h-6 w-6" aria-hidden />}
        emptyTitle={isError ? t('crud.loadError') : t('finance.debts.empty')}
        emptyDescription={isError ? undefined : t('finance.debts.emptyHint')}
      />
    </div>
  );
}
