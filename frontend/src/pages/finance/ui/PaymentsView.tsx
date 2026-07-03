import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Check, Pencil, Trash2, Receipt } from 'lucide-react';

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
import { useStudents } from '@/entities/student';
import {
  usePayments,
  usePayPayment,
  useDeletePayment,
  type Payment,
  type PaymentStatus,
  type PaymentListParams,
} from '@/entities/payment';
import { GeneratePaymentModal, EditPaymentModal } from '@/features/manage-payment';
import { formatMoney, formatPeriod } from '@/shared/lib';

const PAGE_SIZE = 20;

/**
 * Payments list (API_CONTRACT §12). Filters by status / branch / student;
 * generate current-period payments; mark paid / edit / delete — all optimistic.
 */
export function PaymentsView() {
  const { t } = useTranslation();
  const toast = useToast();

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<'' | PaymentStatus>('');
  const [branchId, setBranchId] = useState('');
  const [studentId, setStudentId] = useState('');
  const [studentSearchInput, setStudentSearchInput] = useState('');
  const studentSearch = useDebouncedValue(studentSearchInput.trim(), 350);

  const [generateOpen, setGenerateOpen] = useState(false);
  const [editing, setEditing] = useState<Payment | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Payment | null>(null);

  const { data: branches } = useBranches();
  const { data: studentsData } = useStudents({
    pageSize: 50,
    search: studentSearch || undefined,
  });

  const params = useMemo<PaymentListParams>(
    () => ({
      page,
      pageSize: PAGE_SIZE,
      status: status || undefined,
      branchId: branchId || undefined,
      studentId: studentId || undefined,
    }),
    [page, status, branchId, studentId],
  );

  const { data, isLoading, isError } = usePayments(params);
  const payPayment = usePayPayment();
  const deletePayment = useDeletePayment();

  const payments = data?.items ?? [];
  const pageCount = data?.meta.pageCount ?? 1;
  const total = data?.meta.total ?? 0;

  const branchName = (id: string) =>
    branches?.find((b) => b.id === id)?.name ?? '—';

  const studentName = (p: Payment) =>
    p.student
      ? `${p.student.lastName} ${p.student.firstName}`
      : t('finance.payments.unknownStudent');

  const resetPage = () => setPage(1);

  const handlePay = (payment: Payment) => {
    payPayment.mutate(
      { id: payment.id },
      {
        onSuccess: () => toast.success(t('finance.payments.markedPaid')),
        onError: (err) =>
          toast.error(extractErrorMessage(err) ?? t('form.saveError')),
      },
    );
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    deletePayment.mutate(pendingDelete.id, {
      onSuccess: () => toast.success(t('finance.payments.deleted')),
      onError: (err) =>
        toast.error(extractErrorMessage(err) ?? t('form.deleteError')),
    });
    setPendingDelete(null);
  };

  const columns: DataTableColumn<Payment>[] = [
    {
      id: 'student',
      header: t('finance.payments.student'),
      cell: (p) => (
        <span className="font-medium text-foreground">{studentName(p)}</span>
      ),
    },
    {
      id: 'group',
      header: t('finance.payments.group'),
      cell: (p) => p.group?.name ?? '—',
    },
    {
      id: 'period',
      header: t('finance.payments.period'),
      cell: (p) => formatPeriod(p.billingMonthStart, p.billingMonthEnd),
    },
    {
      id: 'branch',
      header: t('fields.branch'),
      hideOnMobile: true,
      cell: (p) => branchName(p.branchId),
    },
    {
      id: 'amount',
      header: t('finance.records.amount'),
      className: 'text-right',
      headerClassName: 'text-right',
      cell: (p) => (
        <span className="font-medium tabular-nums">{formatMoney(p.amount)}</span>
      ),
    },
    {
      id: 'status',
      header: t('fields.status'),
      cell: (p) =>
        p.status === 'PAID' ? (
          <Badge variant="success" dot>
            {t('finance.payments.status.PAID')}
          </Badge>
        ) : (
          <Badge variant="warning" dot>
            {t('finance.payments.status.UNPAID')}
          </Badge>
        ),
    },
    {
      id: 'actions',
      header: '',
      mobileLabel: t('crud.actions'),
      headerClassName: 'text-right',
      className: 'text-right',
      cell: (p) => (
        <div className="flex justify-end gap-1">
          {p.status !== 'PAID' && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={t('finance.payments.markPaid')}
              title={t('finance.payments.markPaid')}
              onClick={() => handlePay(p)}
              className="text-success hover:bg-success/10"
            >
              <Check className="h-4 w-4" />
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t('actions.edit')}
            onClick={() => setEditing(p)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t('actions.delete')}
            onClick={() => setPendingDelete(p)}
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
      {/* Filters + generate */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Select
            label={t('fields.status')}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as '' | PaymentStatus);
              resetPage();
            }}
            options={[
              { value: '', label: t('finance.payments.allStatuses') },
              { value: 'UNPAID', label: t('finance.payments.status.UNPAID') },
              { value: 'PAID', label: t('finance.payments.status.PAID') },
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
          <div>
            <Input
              label={t('finance.payments.searchStudent')}
              placeholder={t('finance.payments.searchStudentPlaceholder')}
              value={studentSearchInput}
              onChange={(e) => {
                setStudentSearchInput(e.target.value);
                setStudentId('');
                resetPage();
              }}
            />
            {studentSearchInput && (studentsData?.items?.length ?? 0) > 0 && (
              <Select
                aria-label={t('finance.payments.student')}
                className="mt-2"
                value={studentId}
                onChange={(e) => {
                  setStudentId(e.target.value);
                  resetPage();
                }}
                options={[
                  { value: '', label: t('finance.payments.anyStudent') },
                  ...(studentsData?.items ?? []).map((s) => ({
                    value: s.id,
                    label: `${s.lastName} ${s.firstName}`,
                  })),
                ]}
              />
            )}
          </div>
        </div>
        <Button type="button" onClick={() => setGenerateOpen(true)}>
          <Plus className="h-4 w-4" />
          {t('finance.payments.generate')}
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={payments}
        rowKey={(p) => p.id}
        loading={isLoading}
        emptyIcon={<Receipt className="h-6 w-6" aria-hidden />}
        emptyTitle={isError ? t('crud.loadError') : t('finance.payments.empty')}
        emptyDescription={isError ? undefined : t('finance.payments.emptyHint')}
      />

      {!isLoading && total > 0 && (
        <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
          <p className="text-sm text-foreground-muted">
            {t('finance.payments.count', { count: total })}
          </p>
          <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
        </div>
      )}

      <GeneratePaymentModal
        open={generateOpen}
        onClose={() => setGenerateOpen(false)}
      />
      <EditPaymentModal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        payment={editing}
      />
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        title={t('finance.payments.deleteTitle')}
        description={t('finance.payments.deleteConfirm')}
        confirmLabel={t('actions.delete')}
        confirming={deletePayment.isPending}
      />
    </div>
  );
}
