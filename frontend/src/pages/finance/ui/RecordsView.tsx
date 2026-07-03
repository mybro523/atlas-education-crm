import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Trash2, BookText } from 'lucide-react';

import {
  Button,
  Select,
  Input,
  Badge,
  DataTable,
  Pagination,
  ConfirmDialog,
  useToast,
  type DataTableColumn,
} from '@/shared/ui';
import { useDebouncedValue } from '@/shared/lib/hooks';
import { extractErrorMessage } from '@/shared/api';
import { useBranches } from '@/entities/branch';
import {
  useFinanceRecords,
  useDeleteFinanceRecord,
  type FinanceRecord,
  type FinanceType,
  type FinanceRecordListParams,
} from '@/entities/finance-record';
import { FinanceRecordFormModal } from '@/features/manage-finance-record';
import { DateRangeFilter, type DateRange } from './DateRangeFilter';
import { formatMoney, formatDate } from '@/shared/lib';

const PAGE_SIZE = 20;

/**
 * Income/expense records CRUD (API_CONTRACT §13). Filters by type / branch /
 * date-range / search; create/edit/delete all optimistic; TJS amounts.
 */
export function RecordsView() {
  const { t } = useTranslation();
  const toast = useToast();

  const [page, setPage] = useState(1);
  const [type, setType] = useState<'' | FinanceType>('');
  const [branchId, setBranchId] = useState('');
  const [range, setRange] = useState<DateRange>({ from: '', to: '' });
  const [searchInput, setSearchInput] = useState('');
  const search = useDebouncedValue(searchInput.trim(), 350);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<FinanceRecord | null>(null);
  const [pendingDelete, setPendingDelete] = useState<FinanceRecord | null>(null);

  const { data: branches } = useBranches();

  const params = useMemo<FinanceRecordListParams>(
    () => ({
      page,
      pageSize: PAGE_SIZE,
      type: type || undefined,
      branchId: branchId || undefined,
      from: range.from || undefined,
      to: range.to || undefined,
      search: search || undefined,
    }),
    [page, type, branchId, range, search],
  );

  const { data, isLoading, isError } = useFinanceRecords(params);
  const deleteRecord = useDeleteFinanceRecord();

  const records = data?.items ?? [];
  const pageCount = data?.meta.pageCount ?? 1;
  const total = data?.meta.total ?? 0;

  const branchName = (id: string) =>
    branches?.find((b) => b.id === id)?.name ?? '—';

  const resetPage = () => setPage(1);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    deleteRecord.mutate(pendingDelete.id, {
      onSuccess: () => toast.success(t('finance.records.deleted')),
      onError: (err) =>
        toast.error(extractErrorMessage(err) ?? t('form.deleteError')),
    });
    setPendingDelete(null);
  };

  const columns: DataTableColumn<FinanceRecord>[] = [
    {
      id: 'type',
      header: t('finance.records.type'),
      cell: (r) =>
        r.type === 'INCOME' ? (
          <Badge variant="success">{t('finance.records.income')}</Badge>
        ) : (
          <Badge variant="danger">{t('finance.records.expense')}</Badge>
        ),
    },
    {
      id: 'category',
      header: t('finance.records.category'),
      cell: (r) => (
        <div className="flex flex-col items-end gap-0.5 sm:items-start">
          <span className="font-medium text-foreground">
            {r.category || '—'}
          </span>
          {r.description && (
            <span className="text-xs text-foreground-muted">
              {r.description}
            </span>
          )}
        </div>
      ),
    },
    {
      id: 'branch',
      header: t('fields.branch'),
      hideOnMobile: true,
      cell: (r) => branchName(r.branchId),
    },
    {
      id: 'occurredAt',
      header: t('finance.records.occurredAt'),
      cell: (r) => formatDate(r.occurredAt),
    },
    {
      id: 'amount',
      header: t('finance.records.amount'),
      className: 'text-right',
      headerClassName: 'text-right',
      cell: (r) => (
        <span
          className={
            'font-semibold tabular-nums ' +
            (r.type === 'INCOME' ? 'text-success' : 'text-danger')
          }
        >
          {r.type === 'INCOME' ? '+' : '−'}
          {formatMoney(r.amount)}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      mobileLabel: t('crud.actions'),
      headerClassName: 'text-right',
      className: 'text-right',
      cell: (r) => (
        <div className="flex justify-end gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t('actions.edit')}
            onClick={() => {
              setEditing(r);
              setFormOpen(true);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t('actions.delete')}
            onClick={() => setPendingDelete(r)}
            className="text-danger hover:bg-danger/10"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Filters + add */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <DateRangeFilter
            value={range}
            onChange={(next) => {
              setRange(next);
              resetPage();
            }}
          />
          <Button type="button" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            {t('finance.records.add')}
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Select
            label={t('finance.records.type')}
            value={type}
            onChange={(e) => {
              setType(e.target.value as '' | FinanceType);
              resetPage();
            }}
            options={[
              { value: '', label: t('finance.records.allTypes') },
              { value: 'INCOME', label: t('finance.records.income') },
              { value: 'EXPENSE', label: t('finance.records.expense') },
            ]}
          />
          <Select
            label={t('fields.branch')}
            value={branchId}
            onChange={(e) => {
              setBranchId(e.target.value);
              resetPage();
            }}
            options={[
              { value: '', label: t('crud.allBranches') },
              ...(branches ?? []).map((b) => ({ value: b.id, label: b.name })),
            ]}
          />
          <Input
            label={t('common.search')}
            placeholder={t('finance.records.searchPlaceholder')}
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              resetPage();
            }}
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={records}
        rowKey={(r) => r.id}
        loading={isLoading}
        emptyIcon={<BookText className="h-6 w-6" aria-hidden />}
        emptyTitle={isError ? t('crud.loadError') : t('finance.records.empty')}
        emptyDescription={isError ? undefined : t('finance.records.emptyHint')}
      />

      {!isLoading && total > 0 && (
        <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
          <p className="text-sm text-foreground-muted">
            {t('finance.records.count', { count: total })}
          </p>
          <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
        </div>
      )}

      <FinanceRecordFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        record={editing}
      />
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        title={t('finance.records.deleteTitle')}
        description={t('finance.records.deleteConfirm')}
        confirmLabel={t('actions.delete')}
        confirming={deleteRecord.isPending}
      />
    </div>
  );
}
