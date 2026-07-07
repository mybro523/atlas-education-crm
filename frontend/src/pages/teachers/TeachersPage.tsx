import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Trash2, Search, X } from 'lucide-react';
import {
  PageHeader,
  Button,
  Input,
  Select,
  DataTable,
  Pagination,
  ConfirmDialog,
  useToast,
  type DataTableColumn,
} from '@/shared/ui';
import { useDebouncedValue } from '@/shared/lib/hooks';
import { isOptimisticId, formatMoney, toNumber } from '@/shared/lib';
import { extractErrorMessage } from '@/shared/api';
import { useBranches } from '@/entities/branch';
import {
  useTeachers,
  useDeleteTeacher,
  type Teacher,
  type TeacherListParams,
} from '@/entities/teacher';
import { TeacherFormModal } from './ui/TeacherFormModal';
import { TeacherDetailModal } from './ui/TeacherDetailModal';

const PAGE_SIZE = 20;

export function TeachersPage() {
  const { t } = useTranslation();
  const toast = useToast();

  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [branchId, setBranchId] = useState('');
  const search = useDebouncedValue(searchInput.trim(), 350);

  // Modal state.
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Teacher | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Teacher | null>(null);
  const [detailTeacher, setDetailTeacher] = useState<Teacher | null>(null);

  const params = useMemo<TeacherListParams>(
    () => ({
      page,
      pageSize: PAGE_SIZE,
      search: search || undefined,
      branchId: branchId || undefined,
    }),
    [page, search, branchId],
  );

  const { data, isLoading, isError } = useTeachers(params);
  const { data: branches } = useBranches();
  const deleteTeacher = useDeleteTeacher();

  const teachers = data?.items ?? [];
  const pageCount = data?.meta.pageCount ?? 1;
  const total = data?.meta.total ?? 0;

  // Keep the open detail card in sync with the latest list data (e.g. once an
  // optimistically-created teacher is replaced by the server row), falling back
  // to the clicked snapshot if it has paged out of the current results.
  const detailTeacherLive = detailTeacher
    ? (teachers.find((teacher) => teacher.id === detailTeacher.id) ??
      detailTeacher)
    : null;

  const branchName = (id: string) =>
    branches?.find((b) => b.id === id)?.name ?? '—';

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (teacher: Teacher) => {
    if (isOptimisticId(teacher.id)) return;
    setEditing(teacher);
    setFormOpen(true);
  };

  const requestDelete = (teacher: Teacher) => {
    if (isOptimisticId(teacher.id)) return;
    setPendingDelete(teacher);
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    const teacher = pendingDelete;
    if (isOptimisticId(teacher.id)) {
      setPendingDelete(null);
      return;
    }
    deleteTeacher.mutate(teacher.id, {
      onSuccess: () => toast.success(t('teachers.deleted')),
      onError: (err) =>
        toast.error(extractErrorMessage(err) ?? t('form.deleteError')),
    });
    setPendingDelete(null);
  };

  // Reset to page 1 whenever a filter narrows the result set.
  const onSearchChange = (v: string) => {
    setSearchInput(v);
    setPage(1);
  };
  const onBranchChange = (v: string) => {
    setBranchId(v);
    setPage(1);
  };

  const fullName = (teacher: Teacher) =>
    [teacher.lastName, teacher.firstName, teacher.middleName]
      .filter(Boolean)
      .join(' ');

  const columns: DataTableColumn<Teacher>[] = [
    {
      id: 'name',
      header: `${t('fields.lastName')} / ${t('fields.firstName')}`,
      mobileLabel: t('fields.firstName'),
      sortValue: (teacher) => `${teacher.lastName} ${teacher.firstName}`,
      cell: (teacher) => (
        <span className="font-medium text-foreground">{fullName(teacher)}</span>
      ),
    },
    {
      id: 'phone',
      header: t('fields.phone'),
      sortValue: (teacher) => teacher.phone || null,
      cell: (teacher) => teacher.phone || '—',
    },
    {
      id: 'branch',
      header: t('fields.branch'),
      sortValue: (teacher) => branchName(teacher.branchId),
      cell: (teacher) => branchName(teacher.branchId),
    },
    {
      id: 'hourlyRate',
      header: t('fields.hourlyRate'),
      sortValue: (teacher) =>
        teacher.hourlyRate != null ? toNumber(teacher.hourlyRate) : null,
      cell: (teacher) =>
        teacher.hourlyRate != null ? formatMoney(teacher.hourlyRate) : '—',
    },
    {
      id: 'actions',
      header: '',
      mobileLabel: t('crud.actions'),
      headerClassName: 'text-right',
      className: 'text-right',
      cell: (teacher) => (
        <div className="flex justify-end gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t('actions.edit')}
            disabled={isOptimisticId(teacher.id)}
            onClick={(e) => {
              e.stopPropagation();
              openEdit(teacher);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t('actions.delete')}
            disabled={isOptimisticId(teacher.id)}
            onClick={(e) => {
              e.stopPropagation();
              requestDelete(teacher);
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
        title={t('teachers.title')}
        description={t('teachers.subtitle')}
        actions={
          <Button type="button" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            {t('teachers.add')}
          </Button>
        }
      />

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <Input
            type="search"
            value={searchInput}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t('teachers.searchPlaceholder')}
            aria-label={t('teachers.searchPlaceholder')}
            leftIcon={<Search className="h-4 w-4" />}
            className={searchInput ? 'pr-10' : undefined}
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label={t('actions.clearSearch')}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-foreground-muted transition-colors hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
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

      <DataTable
        columns={columns}
        data={teachers}
        rowKey={(teacher) => teacher.id}
        loading={isLoading}
        onRowClick={setDetailTeacher}
        emptyTitle={isError ? t('crud.loadError') : t('teachers.empty')}
        emptyDescription={isError ? undefined : t('teachers.emptyHint')}
      />

      {!isLoading && total > 0 && (
        <div className="mt-4 flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
          <p className="text-sm text-foreground-muted">
            {t('teachers.count', { count: total })}
          </p>
          <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
        </div>
      )}

      <TeacherFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        teacher={editing}
      />

      <TeacherDetailModal
        open={Boolean(detailTeacher)}
        onClose={() => setDetailTeacher(null)}
        teacher={detailTeacherLive}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        title={t('teachers.deleteTitle')}
        description={t('teachers.deleteConfirm', {
          name: pendingDelete
            ? `${pendingDelete.firstName} ${pendingDelete.lastName}`
            : '',
        })}
        confirmLabel={t('actions.delete')}
        confirming={deleteTeacher.isPending}
      />
    </div>
  );
}
