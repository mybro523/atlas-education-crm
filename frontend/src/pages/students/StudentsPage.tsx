import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Trash2, Users, Wallet } from 'lucide-react';
import {
  PageHeader,
  Button,
  Select,
  Badge,
  DataTable,
  Pagination,
  ConfirmDialog,
  useToast,
  type DataTableColumn,
} from '@/shared/ui';
import { useDebouncedValue } from '@/shared/lib/hooks';
import { isOptimisticId } from '@/shared/lib';
import { extractErrorMessage } from '@/shared/api';
import { useBranches } from '@/entities/branch';
import { useCourses } from '@/entities/course';
import { useGroups } from '@/entities/group';
import {
  useStudents,
  useDeleteStudent,
  type Student,
  type StudentListParams,
} from '@/entities/student';
import { StudentSearch } from '@/features/search-students';
import { RecordPaymentModal } from '@/features/record-payment';
import { StudentFormModal } from './ui/StudentFormModal';
import { StudentDetailModal } from './ui/StudentDetailModal';

const PAGE_SIZE = 20;

/** Locale-aware short date; falls back to em dash. */
function formatDate(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
}

export function StudentsPage() {
  const { t } = useTranslation();
  const toast = useToast();

  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [branchId, setBranchId] = useState('');
  const [courseId, setCourseId] = useState('');
  const [groupId, setGroupId] = useState('');
  const [debt, setDebt] = useState<'' | 'with' | 'without'>('');
  const search = useDebouncedValue(searchInput.trim(), 250);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Student | null>(null);
  const [detailStudent, setDetailStudent] = useState<Student | null>(null);
  const [payingStudent, setPayingStudent] = useState<Student | null>(null);

  const params = useMemo<StudentListParams>(
    () => ({
      page,
      pageSize: PAGE_SIZE,
      search: search || undefined,
      branchId: branchId || undefined,
      courseId: courseId || undefined,
      groupId: groupId || undefined,
      debt: debt || undefined,
    }),
    [page, search, branchId, courseId, groupId, debt],
  );

  const { data, isLoading, isError, isPlaceholderData } = useStudents(params);
  const { data: branches } = useBranches();
  const { data: coursesData } = useCourses({ pageSize: 100 });
  const { data: groupsData } = useGroups({ pageSize: 100 });
  const deleteStudent = useDeleteStudent();

  const serverStudents = data?.items ?? [];

  // INSTANT search: while the debounce/server round-trip is still pending, the
  // previous rows stay visible (keepPreviousData) — narrow them locally by the
  // same fields the server matches (name + parent workplace/position) so every
  // keystroke reacts immediately; the server response then reconciles.
  const pendingSearch = searchInput.trim();
  const searchLagging =
    pendingSearch.length > 0 && (pendingSearch !== search || isPlaceholderData);
  const students = useMemo(() => {
    if (!searchLagging) return serverStudents;
    const q = pendingSearch.toLowerCase();
    return serverStudents.filter((s) => {
      const name =
        `${s.lastName} ${s.firstName} ${s.middleName ?? ''}`.toLowerCase();
      if (name.includes(q)) return true;
      return (s.parents ?? []).some(
        (p) =>
          (p.workplace ?? '').toLowerCase().includes(q) ||
          (p.position ?? '').toLowerCase().includes(q),
      );
    });
  }, [serverStudents, searchLagging, pendingSearch]);

  const pageCount = data?.meta.pageCount ?? 1;
  const total = data?.meta.total ?? 0;

  // Keep the open detail card in sync with the latest list data (e.g. once an
  // optimistically-created student is replaced by the server row), falling back
  // to the clicked snapshot if it has paged out of the current results.
  const detailStudentLive = detailStudent
    ? (students.find((s) => s.id === detailStudent.id) ?? detailStudent)
    : null;

  const branchName = (id: string) =>
    branches?.find((b) => b.id === id)?.name ?? '—';

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (student: Student) => {
    if (isOptimisticId(student.id)) return;
    setEditing(student);
    setFormOpen(true);
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    if (isOptimisticId(pendingDelete.id)) return;
    deleteStudent.mutate(pendingDelete.id, {
      onSuccess: () => toast.success(t('students.deleted')),
      onError: (err) =>
        toast.error(extractErrorMessage(err) ?? t('form.deleteError')),
    });
    setPendingDelete(null);
  };

  const onSearchChange = (v: string) => {
    setSearchInput(v);
    setPage(1);
  };
  const onBranchChange = (v: string) => {
    setBranchId(v);
    setPage(1);
  };
  const onCourseChange = (v: string) => {
    setCourseId(v);
    setPage(1);
  };
  const onGroupChange = (v: string) => {
    setGroupId(v);
    setPage(1);
  };
  const onDebtChange = (v: '' | 'with' | 'without') => {
    setDebt(v);
    setPage(1);
  };

  const fullName = (student: Student) =>
    [student.lastName, student.firstName, student.middleName]
      .filter(Boolean)
      .join(' ');

  const columns: DataTableColumn<Student>[] = [
    {
      id: 'name',
      header: `${t('fields.lastName')} / ${t('fields.firstName')}`,
      mobileLabel: t('fields.firstName'),
      cell: (student) => (
        <div className="flex flex-col items-end gap-1 sm:items-start">
          <span className="font-medium text-foreground">
            {fullName(student)}
          </span>
          {!student.isActive && (
            <Badge variant="muted">{t('students.inactive')}</Badge>
          )}
        </div>
      ),
    },
    {
      id: 'phone',
      header: t('fields.phone'),
      cell: (student) => student.phone || '—',
    },
    {
      id: 'branch',
      header: t('fields.branch'),
      cell: (student) => branchName(student.branchId),
    },
    {
      id: 'enrollmentDate',
      header: t('fields.enrollmentDate'),
      cell: (student) => formatDate(student.enrollmentDate),
    },
    {
      id: 'subscription',
      header: t('students.subscription'),
      mobileLabel: t('students.subscription'),
      cell: (student) => {
        const due =
          student.dueAmount ??
          student.courseFee ??
          student.course?.pricePerMonth ??
          0;
        const paid = student.paidAmount ?? 0;
        const owed = student.owedAmount ?? Math.max(0, due - paid);
        if (!due && !paid)
          return <span className="text-foreground-muted">—</span>;
        const fmt = (n: number) =>
          `${new Intl.NumberFormat('ru-RU').format(n)} TJS`;
        return (
          <div className="text-sm leading-tight">
            <div className="text-foreground">
              {fmt(paid)} / {fmt(due)}
            </div>
            {owed > 0 && (
              <div className="text-xs text-danger">
                {t('students.owedShort')}: {fmt(owed)}
              </div>
            )}
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: '',
      mobileLabel: t('crud.actions'),
      headerClassName: 'text-right',
      className: 'text-right',
      cell: (student) => (
        <div className="flex justify-end gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t('payments.record')}
            disabled={isOptimisticId(student.id)}
            onClick={(e) => {
              e.stopPropagation();
              if (isOptimisticId(student.id)) return;
              setPayingStudent(student);
            }}
          >
            <Wallet className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t('actions.edit')}
            disabled={isOptimisticId(student.id)}
            onClick={(e) => {
              e.stopPropagation();
              openEdit(student);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t('actions.delete')}
            disabled={isOptimisticId(student.id)}
            onClick={(e) => {
              e.stopPropagation();
              if (isOptimisticId(student.id)) return;
              setPendingDelete(student);
            }}
            className="text-danger hover:bg-danger/10"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={t('students.title')}
        description={t('students.subtitle')}
        actions={
          <Button type="button" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            {t('students.add')}
          </Button>
        }
      />

      {/* Filters: search (name OR parent workplace OR position) + branch +
          course + group + subscription debt. */}
      <div className="mb-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <div className="sm:col-span-2 lg:col-span-2">
            <StudentSearch value={searchInput} onChange={onSearchChange} />
          </div>
          <Select
            value={branchId}
            onChange={(e) => onBranchChange(e.target.value)}
            aria-label={t('fields.branch')}
          >
            <option value="">{t('crud.allBranches')}</option>
            {(branches ?? []).map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
          <Select
            value={courseId}
            onChange={(e) => onCourseChange(e.target.value)}
            aria-label={t('fields.course')}
          >
            <option value="">{t('students.filters.allCourses')}</option>
            {(coursesData?.items ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select
            value={groupId}
            onChange={(e) => onGroupChange(e.target.value)}
            aria-label={t('students.filters.group')}
          >
            <option value="">{t('students.filters.allGroups')}</option>
            {(groupsData?.items ?? []).map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </Select>
          <Select
            value={debt}
            onChange={(e) =>
              onDebtChange(e.target.value as '' | 'with' | 'without')
            }
            aria-label={t('students.filters.debt')}
          >
            <option value="">{t('students.filters.debtAll')}</option>
            <option value="with">{t('students.filters.debtOnly')}</option>
            <option value="without">{t('students.filters.debtNone')}</option>
          </Select>
        </div>
        <p className="mt-2 text-xs text-foreground-muted">
          {t('students.searchHint')}
        </p>
      </div>

      <DataTable
        columns={columns}
        data={students}
        rowKey={(student) => student.id}
        loading={isLoading}
        onRowClick={setDetailStudent}
        emptyIcon={<Users className="h-6 w-6" aria-hidden />}
        emptyTitle={isError ? t('crud.loadError') : t('students.empty')}
        emptyDescription={isError ? undefined : t('students.emptyHint')}
      />

      {!isLoading && total > 0 && (
        <div className="mt-4 flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
          <p className="text-sm text-foreground-muted">
            {t('students.count', { count: total })}
          </p>
          <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
        </div>
      )}

      <StudentFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        student={editing}
      />

      <StudentDetailModal
        open={Boolean(detailStudent)}
        onClose={() => setDetailStudent(null)}
        student={detailStudentLive}
      />

      <RecordPaymentModal
        open={Boolean(payingStudent)}
        onClose={() => setPayingStudent(null)}
        student={payingStudent}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        title={t('students.deleteTitle')}
        description={t('students.deleteConfirm', {
          name: pendingDelete
            ? `${pendingDelete.firstName} ${pendingDelete.lastName}`
            : '',
        })}
        confirmLabel={t('actions.delete')}
        confirming={deleteStudent.isPending}
      />
    </div>
  );
}
