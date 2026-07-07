import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlarmClock, Receipt, X } from 'lucide-react';

import {
  PageHeader,
  Button,
  Input,
  Select,
  Badge,
  DataTable,
  Pagination,
  type DataTableColumn,
} from '@/shared/ui';
import { useDebouncedValue } from '@/shared/lib/hooks';
import { formatMoney, formatDate } from '@/shared/lib';
import { useBranches } from '@/entities/branch';
import {
  useStudentPayments,
  useUpcomingPayments,
  type UpcomingPayment,
} from '@/entities/student-payment';

const PAGE_SIZE = 20;

/** Row + params shapes are derived from the hook so the page stays decoupled
 * from the entity's exact exported type names. */
type StudentPaymentRow = NonNullable<
  ReturnType<typeof useStudentPayments>['data']
>['items'][number];
type StudentPaymentParams = NonNullable<Parameters<typeof useStudentPayments>[0]>;
type PaymentMethod = StudentPaymentRow['method'];

/**
 * "История оплат студентов" (ADMIN + FOUNDER). Read-only ledger of subscription
 * payments recorded via POST /student-payments, with search / branch / method /
 * date-range filters and pagination. Separate from the FOUNDER-only monthly
 * billing under /finance.
 */
export function StudentPaymentsPage() {
  const { t } = useTranslation();

  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [branchId, setBranchId] = useState('');
  const [method, setMethod] = useState<'' | PaymentMethod>('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const search = useDebouncedValue(searchInput.trim(), 350);

  const { data: branches } = useBranches();

  const params = useMemo<StudentPaymentParams>(
    () => ({
      page,
      pageSize: PAGE_SIZE,
      search: search || undefined,
      branchId: branchId || undefined,
      method: method || undefined,
      from: from || undefined,
      to: to || undefined,
    }),
    [page, search, branchId, method, from, to],
  );

  const { data, isLoading, isError } = useStudentPayments(params);
  // Subscriptions running out within 3 days (incl. already-expired) — shown
  // on top so the admin immediately sees who must pay for the next month.
  const { data: upcoming } = useUpcomingPayments(3);

  const payments = data?.items ?? [];
  const pageCount = data?.meta.pageCount ?? 1;
  const total = data?.meta.total ?? 0;

  const resetPage = () => setPage(1);
  const hasRange = Boolean(from || to);

  const studentName = (p: StudentPaymentRow) =>
    p.student ? `${p.student.lastName} ${p.student.firstName}` : '—';

  const methodLabel = (m: PaymentMethod) => t(`payments.method.${m}`);

  const columns: DataTableColumn<StudentPaymentRow>[] = [
    {
      id: 'student',
      header: t('studentPayments.columns.student'),
      sortValue: (p) => studentName(p),
      cell: (p) => (
        <span className="font-medium text-foreground">{studentName(p)}</span>
      ),
    },
    {
      id: 'group',
      header: t('studentPayments.columns.group'),
      sortValue: (p) => p.group?.name ?? null,
      cell: (p) => p.group?.name ?? '—',
    },
    {
      id: 'amount',
      header: t('studentPayments.columns.amount'),
      className: 'text-right',
      headerClassName: 'text-right',
      sortValue: (p) => Number(p.amount),
      cell: (p) => (
        <span className="font-medium tabular-nums">{formatMoney(p.amount)}</span>
      ),
    },
    {
      id: 'method',
      header: t('studentPayments.columns.method'),
      sortValue: (p) => p.method,
      cell: (p) => (
        <Badge variant={p.method === 'CASH' ? 'success' : 'primary'} dot>
          {methodLabel(p.method)}
        </Badge>
      ),
    },
    {
      id: 'paidAt',
      header: t('studentPayments.columns.date'),
      sortValue: (p) => p.paidAt,
      cell: (p) => formatDate(p.paidAt),
    },
    {
      id: 'branch',
      header: t('studentPayments.columns.branch'),
      hideOnMobile: true,
      sortValue: (p) => p.branch?.name ?? null,
      cell: (p) => p.branch?.name ?? '—',
    },
  ];

  const methodOptions = [
    { value: '', label: t('studentPayments.filters.allMethods') },
    { value: 'CASH', label: t('payments.method.CASH') },
    { value: 'CARD', label: t('payments.method.CARD') },
  ];

  const branchOptions = [
    { value: '', label: t('crud.allBranches') },
    ...(branches ?? []).map((b) => ({ value: b.id, label: b.name })),
  ];

  const upcomingName = (u: UpcomingPayment) =>
    `${u.student.lastName} ${u.student.firstName}`;

  return (
    <div>
      <PageHeader
        title={t('studentPayments.title')}
        description={t('studentPayments.subtitle')}
      />

      {/* "Subscription ending soon" — who must pay for the next month. */}
      {(upcoming?.length ?? 0) > 0 && (
        <section className="mb-5 rounded-xl border border-danger/30 bg-danger/5 p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <AlarmClock className="h-4 w-4 text-danger" aria-hidden />
            {t('studentPayments.upcoming.title')}
            <span className="font-normal text-foreground-muted">
              ({upcoming!.length})
            </span>
          </h2>
          <p className="mt-0.5 text-xs text-foreground-muted">
            {t('studentPayments.upcoming.hint')}
          </p>
          <ul className="mt-3 divide-y divide-border/60">
            {upcoming!.map((u) => (
              <li
                key={u.student.id}
                className="flex flex-col gap-1 py-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <span className="font-medium text-foreground">
                    {upcomingName(u)}
                  </span>
                  {u.branch && (
                    <span className="ml-2 text-xs text-foreground-muted">
                      {u.branch.name}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-foreground-muted">
                    {t('studentPayments.upcoming.endsAt')}:{' '}
                    {formatDate(u.endsAt)}
                  </span>
                  <span className="tabular-nums text-foreground-muted">
                    {formatMoney(u.monthlyFee)}
                  </span>
                  {u.overdue ? (
                    <Badge variant="danger" dot>
                      {t('studentPayments.upcoming.overdue')}
                    </Badge>
                  ) : (
                    <Badge variant="warning" dot>
                      {u.daysLeft === 0
                        ? t('studentPayments.upcoming.today')
                        : t('studentPayments.upcoming.daysLeft', {
                            count: u.daysLeft,
                          })}
                    </Badge>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Filters: search + branch + method + date range */}
      <div className="mb-4 flex flex-col gap-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Input
            label={t('studentPayments.filters.search')}
            placeholder={t('studentPayments.filters.searchPlaceholder')}
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              resetPage();
            }}
          />
          <Select
            label={t('studentPayments.columns.branch')}
            value={branchId}
            onChange={(e) => {
              setBranchId(e.target.value);
              resetPage();
            }}
            options={branchOptions}
          />
          <Select
            label={t('studentPayments.columns.method')}
            value={method}
            onChange={(e) => {
              setMethod(e.target.value as '' | PaymentMethod);
              resetPage();
            }}
            options={methodOptions}
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="sm:w-44">
            <Input
              label={t('studentPayments.filters.from')}
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                resetPage();
              }}
            />
          </div>
          <div className="sm:w-44">
            <Input
              label={t('studentPayments.filters.to')}
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                resetPage();
              }}
            />
          </div>
          {hasRange && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setFrom('');
                setTo('');
                resetPage();
              }}
              className="self-start sm:self-auto"
            >
              <X className="h-4 w-4" />
              {t('studentPayments.filters.clear')}
            </Button>
          )}
        </div>
      </div>

      <DataTable
        columns={columns}
        data={payments}
        rowKey={(p) => p.id}
        loading={isLoading}
        emptyIcon={<Receipt className="h-6 w-6" aria-hidden />}
        emptyTitle={isError ? t('crud.loadError') : t('studentPayments.empty')}
        emptyDescription={isError ? undefined : t('studentPayments.emptyHint')}
      />

      {!isLoading && total > 0 && (
        <div className="mt-4 flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
          <p className="text-sm text-foreground-muted">
            {t('studentPayments.count', { count: total })}
          </p>
          <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
