import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Trash2, Users } from 'lucide-react';
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
import { extractErrorMessage } from '@/shared/api';
import { useBranches } from '@/entities/branch';
import {
  useStudents,
  useDeleteStudent,
  type Student,
  type StudentListParams,
} from '@/entities/student';
import { StudentSearch } from '@/features/search-students';
import { StudentFormModal } from './ui/StudentFormModal';

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
  const search = useDebouncedValue(searchInput.trim(), 350);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Student | null>(null);

  const params = useMemo<StudentListParams>(
    () => ({
      page,
      pageSize: PAGE_SIZE,
      search: search || undefined,
      branchId: branchId || undefined,
    }),
    [page, search, branchId],
  );

  const { data, isLoading, isError } = useStudents(params);
  const { data: branches } = useBranches();
  const deleteStudent = useDeleteStudent();

  const students = data?.items ?? [];
  const pageCount = data?.meta.pageCount ?? 1;
  const total = data?.meta.total ?? 0;

  const branchName = (id: string) =>
    branches?.find((b) => b.id === id)?.name ?? '—';

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (student: Student) => {
    setEditing(student);
    setFormOpen(true);
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
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
            aria-label={t('actions.edit')}
            onClick={() => openEdit(student)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t('actions.delete')}
            onClick={() => setPendingDelete(student)}
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

      {/* Filters: single search box (name OR parent workplace OR position) + branch. */}
      <div className="mb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <StudentSearch value={searchInput} onChange={onSearchChange} />
          <Select
            value={branchId}
            onChange={(e) => onBranchChange(e.target.value)}
            className="w-full sm:w-56"
            aria-label={t('fields.branch')}
          >
            <option value="">{t('crud.allBranches')}</option>
            {(branches ?? []).map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
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
