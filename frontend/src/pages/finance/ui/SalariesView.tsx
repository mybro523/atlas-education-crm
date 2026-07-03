import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Calculator, Check, Trash2, Banknote } from 'lucide-react';

import {
  Button,
  Select,
  Badge,
  DataTable,
  Pagination,
  ConfirmDialog,
  useToast,
  type DataTableColumn,
} from '@/shared/ui';
import { extractErrorMessage } from '@/shared/api';
import { useTeachers } from '@/entities/teacher';
import {
  useSalaries,
  usePaySalary,
  useDeleteSalary,
  type Salary,
  type SalaryStatus,
  type SalaryListParams,
} from '@/entities/salary';
import { ComputeSalaryModal } from '@/features/compute-salary';
import { LessonRatesPanel } from './LessonRatesPanel';
import { formatMoney, formatPeriod } from '@/shared/lib';

const PAGE_SIZE = 20;

/**
 * Salaries (API_CONTRACT §14). Compute a teacher's per-lesson salary for a
 * period (modal), list persisted salaries with teacher/status filters, mark
 * paid / delete optimistically, and manage the lesson-rate dictionary below.
 */
export function SalariesView() {
  const { t } = useTranslation();
  const toast = useToast();

  const [page, setPage] = useState(1);
  const [teacherId, setTeacherId] = useState('');
  const [status, setStatus] = useState<'' | SalaryStatus>('');

  const [computeOpen, setComputeOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Salary | null>(null);

  const { data: teachersData } = useTeachers({ pageSize: 100 });

  const params = useMemo<SalaryListParams>(
    () => ({
      page,
      pageSize: PAGE_SIZE,
      teacherId: teacherId || undefined,
      status: status || undefined,
    }),
    [page, teacherId, status],
  );

  const { data, isLoading, isError } = useSalaries(params);
  const paySalary = usePaySalary();
  const deleteSalary = useDeleteSalary();

  const salaries = data?.items ?? [];
  const pageCount = data?.meta.pageCount ?? 1;
  const total = data?.meta.total ?? 0;

  const teacherName = (s: Salary) => {
    if (s.teacher) return `${s.teacher.lastName} ${s.teacher.firstName}`;
    if (s.employee) return `${s.employee.lastName} ${s.employee.firstName}`;
    const found = (teachersData?.items ?? []).find(
      (te) => te.id === s.teacherId,
    );
    return found
      ? `${found.lastName} ${found.firstName}`
      : t('finance.salaries.unknownTeacher');
  };

  const resetPage = () => setPage(1);

  const handlePay = (salary: Salary) => {
    paySalary.mutate(
      { id: salary.id },
      {
        onSuccess: () => toast.success(t('finance.salaries.markedPaid')),
        onError: (err) =>
          toast.error(extractErrorMessage(err) ?? t('form.saveError')),
      },
    );
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    deleteSalary.mutate(pendingDelete.id, {
      onSuccess: () => toast.success(t('finance.salaries.deleted')),
      onError: (err) =>
        toast.error(extractErrorMessage(err) ?? t('form.deleteError')),
    });
    setPendingDelete(null);
  };

  const columns: DataTableColumn<Salary>[] = [
    {
      id: 'teacher',
      header: t('finance.salaries.teacher'),
      cell: (s) => (
        <span className="font-medium text-foreground">{teacherName(s)}</span>
      ),
    },
    {
      id: 'period',
      header: t('finance.salaries.period'),
      cell: (s) => formatPeriod(s.periodStart, s.periodEnd),
    },
    {
      id: 'basis',
      header: t('finance.salaries.basis'),
      hideOnMobile: true,
      cell: (s) => (
        <Badge variant="muted">
          {s.basis === 'PER_LESSON'
            ? t('finance.salaries.perLesson')
            : t('finance.salaries.fixed')}
        </Badge>
      ),
    },
    {
      id: 'amount',
      header: t('finance.records.amount'),
      className: 'text-right',
      headerClassName: 'text-right',
      cell: (s) => (
        <span className="font-semibold tabular-nums">
          {formatMoney(s.amount)}
        </span>
      ),
    },
    {
      id: 'status',
      header: t('fields.status'),
      cell: (s) =>
        s.status === 'PAID' ? (
          <Badge variant="success" dot>
            {t('finance.salaries.status.PAID')}
          </Badge>
        ) : (
          <Badge variant="warning" dot>
            {t('finance.salaries.status.PENDING')}
          </Badge>
        ),
    },
    {
      id: 'actions',
      header: '',
      mobileLabel: t('crud.actions'),
      headerClassName: 'text-right',
      className: 'text-right',
      cell: (s) => (
        <div className="flex justify-end gap-1">
          {s.status !== 'PAID' && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={t('finance.salaries.markPaid')}
              title={t('finance.salaries.markPaid')}
              onClick={() => handlePay(s)}
              className="text-success hover:bg-success/10"
            >
              <Check className="h-4 w-4" />
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t('actions.delete')}
            onClick={() => setPendingDelete(s)}
            className="text-danger hover:bg-danger/10"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {/* Filters + compute */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:w-56">
              <Select
                label={t('finance.salaries.teacher')}
                value={teacherId}
                onChange={(e) => {
                  setTeacherId(e.target.value);
                  resetPage();
                }}
                options={[
                  { value: '', label: t('finance.salaries.allTeachers') },
                  ...(teachersData?.items ?? []).map((te) => ({
                    value: te.id,
                    label: `${te.lastName} ${te.firstName}`,
                  })),
                ]}
              />
            </div>
            <div className="sm:w-44">
              <Select
                label={t('fields.status')}
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value as '' | SalaryStatus);
                  resetPage();
                }}
                options={[
                  { value: '', label: t('finance.salaries.allStatuses') },
                  {
                    value: 'PENDING',
                    label: t('finance.salaries.status.PENDING'),
                  },
                  { value: 'PAID', label: t('finance.salaries.status.PAID') },
                ]}
              />
            </div>
          </div>
          <Button type="button" onClick={() => setComputeOpen(true)}>
            <Calculator className="h-4 w-4" />
            {t('finance.salaries.compute')}
          </Button>
        </div>

        <DataTable
          columns={columns}
          data={salaries}
          rowKey={(s) => s.id}
          loading={isLoading}
          emptyIcon={<Banknote className="h-6 w-6" aria-hidden />}
          emptyTitle={
            isError ? t('crud.loadError') : t('finance.salaries.empty')
          }
          emptyDescription={
            isError ? undefined : t('finance.salaries.emptyHint')
          }
        />

        {!isLoading && total > 0 && (
          <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
            <p className="text-sm text-foreground-muted">
              {t('finance.salaries.count', { count: total })}
            </p>
            <Pagination
              page={page}
              pageCount={pageCount}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>

      {/* Lesson-rate dictionary */}
      <LessonRatesPanel />

      <ComputeSalaryModal
        open={computeOpen}
        onClose={() => setComputeOpen(false)}
      />
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        title={t('finance.salaries.deleteTitle')}
        description={t('finance.salaries.deleteConfirm')}
        confirmLabel={t('actions.delete')}
        confirming={deleteSalary.isPending}
      />
    </div>
  );
}
