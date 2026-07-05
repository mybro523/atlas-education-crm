import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Trash2, BookOpen, Search, RotateCcw } from 'lucide-react';

import {
  Badge,
  Button,
  ConfirmDialog,
  DataTable,
  InlineError,
  Input,
  PageHeader,
  Pagination,
  Select,
  useToast,
  type DataTableColumn,
} from '@/shared/ui';
import { CURRENCY } from '@/shared/config';
import { useDebouncedValue } from '@/shared/lib/hooks';
import { useBranches } from '@/entities/branch';
import { useCourseTypes } from '@/entities/course-type';
import {
  useCourses,
  useDeleteCourse,
  type Course,
  type CourseListParams,
} from '@/entities/course';
import { CourseFormModal } from '@/features/manage-course';

const PAGE_SIZE = 20;

type ActiveFilter = 'all' | 'active' | 'inactive';

/** Format an ISO date (or date-only string) as `DD.MM.YYYY`; null when empty. */
function formatDate(value?: string | null): string | null {
  if (!value) return null;
  const [y, m, d] = value.slice(0, 10).split('-');
  if (!y || !m || !d) return null;
  return `${d}.${m}.${y}`;
}

/** Admin CRUD screen for Courses (paginated; branch/type/search filters). */
export function CoursesPage() {
  const { t } = useTranslation();
  const toast = useToast();

  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const search = useDebouncedValue(searchInput.trim(), 350);
  const [branchId, setBranchId] = useState('');
  const [courseTypeId, setCourseTypeId] = useState('');
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all');

  // Reset to page 1 whenever any filter changes.
  useEffect(() => {
    setPage(1);
  }, [search, branchId, courseTypeId, activeFilter]);

  const params: CourseListParams = {
    page,
    pageSize: PAGE_SIZE,
    ...(search ? { search } : {}),
    ...(branchId ? { branchId } : {}),
    ...(courseTypeId ? { courseTypeId } : {}),
    ...(activeFilter !== 'all' ? { active: activeFilter === 'active' } : {}),
  };

  const { data, isLoading, isError, isFetching } = useCourses(params);
  const deleteCourse = useDeleteCourse();

  // Dictionaries for filters + resolving relation names in the table.
  const { data: branches } = useBranches();
  const { data: courseTypes } = useCourseTypes();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);
  const [deleting, setDeleting] = useState<Course | null>(null);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (course: Course) => {
    setEditing(course);
    setFormOpen(true);
  };

  const confirmDelete = () => {
    if (!deleting) return;
    deleteCourse.mutate(deleting.id, {
      onSuccess: () => toast.success(t('crud.deleted')),
      onError: () => toast.error(t('crud.deleteError')),
    });
    setDeleting(null);
  };

  // Lookup maps so list rows can show names even when the API omits nested relations.
  const branchName = useMemo(() => {
    const map = new Map((branches ?? []).map((b) => [b.id, b.name]));
    return (c: Course) => c.branch?.name ?? map.get(c.branchId) ?? '—';
  }, [branches]);
  const courseTypeName = useMemo(() => {
    const map = new Map((courseTypes ?? []).map((ct) => [ct.id, ct.name]));
    return (c: Course) => c.courseType?.name ?? map.get(c.courseTypeId) ?? '—';
  }, [courseTypes]);

  const priceFormatter = useMemo(
    () =>
      new Intl.NumberFormat('ru-RU', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }),
    [],
  );

  const branchOptions = useMemo(
    () => [
      { value: '', label: t('crud.allBranches') },
      ...(branches ?? []).map((b) => ({ value: b.id, label: b.name })),
    ],
    [branches, t],
  );
  const courseTypeOptions = useMemo(
    () => [
      { value: '', label: t('crud.allTypes') },
      ...(courseTypes ?? []).map((ct) => ({ value: ct.id, label: ct.name })),
    ],
    [courseTypes, t],
  );

  const hasFilters =
    Boolean(searchInput) ||
    Boolean(branchId) ||
    Boolean(courseTypeId) ||
    activeFilter !== 'all';

  const resetFilters = () => {
    setSearchInput('');
    setBranchId('');
    setCourseTypeId('');
    setActiveFilter('all');
  };

  const columns = useMemo<DataTableColumn<Course>[]>(
    () => [
      {
        id: 'name',
        header: t('courses.name'),
        cell: (c) => <span className="font-medium text-foreground">{c.name}</span>,
      },
      {
        id: 'courseType',
        header: t('courses.courseType'),
        cell: (c) => (
          <span className="text-foreground-muted">{courseTypeName(c)}</span>
        ),
      },
      {
        id: 'branch',
        header: t('courses.branch'),
        cell: (c) => (
          <span className="text-foreground-muted">{branchName(c)}</span>
        ),
      },
      {
        id: 'term',
        header: t('courses.term'),
        mobileLabel: t('courses.term'),
        className: 'whitespace-nowrap',
        cell: (c) => {
          const start = formatDate(c.startDate);
          const end = formatDate(c.endDate);
          if (!start && !end) {
            return <span className="text-foreground-muted">—</span>;
          }
          return (
            <span className="text-foreground-muted">
              {start ?? '…'} – {end ?? '…'}
            </span>
          );
        },
      },
      {
        id: 'price',
        header: t('courses.pricePerMonth'),
        className: 'whitespace-nowrap',
        cell: (c) => (
          <span className="font-medium text-foreground">
            {priceFormatter.format(Number(c.pricePerMonth))} {CURRENCY}
          </span>
        ),
      },
      {
        id: 'status',
        header: t('fields.status'),
        cell: (c) => (
          <Badge variant={c.isActive ? 'success' : 'muted'} dot>
            {c.isActive ? t('status.active') : t('status.inactive')}
          </Badge>
        ),
      },
      {
        id: 'actions',
        header: <span className="sr-only">{t('crud.actions')}</span>,
        className: 'text-right',
        mobileLabel: t('crud.actions'),
        cell: (c) => (
          <div className="flex items-center justify-end gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('crud.edit')}
              onClick={() => openEdit(c)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('crud.delete')}
              onClick={() => setDeleting(c)}
            >
              <Trash2 className="h-4 w-4 text-danger" />
            </Button>
          </div>
        ),
      },
    ],
    [t, branchName, courseTypeName, priceFormatter],
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('courses.title')}
        description={t('courses.subtitle')}
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            {t('courses.add')}
          </Button>
        }
      />

      {/* Filter bar */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2 lg:col-span-1">
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t('crud.searchPlaceholder')}
            leftIcon={<Search className="h-4 w-4" />}
            aria-label={t('common.search')}
          />
        </div>
        <Select
          value={branchId}
          onChange={(e) => setBranchId(e.target.value)}
          options={branchOptions}
          aria-label={t('courses.branch')}
        />
        <Select
          value={courseTypeId}
          onChange={(e) => setCourseTypeId(e.target.value)}
          options={courseTypeOptions}
          aria-label={t('courses.courseType')}
        />
        <Select
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value as ActiveFilter)}
          aria-label={t('fields.status')}
          options={[
            { value: 'all', label: t('crud.statusAll') },
            { value: 'active', label: t('status.active') },
            { value: 'inactive', label: t('status.inactive') },
          ]}
        />
        {hasFilters && (
          <Button
            variant="ghost"
            onClick={resetFilters}
            className="justify-start sm:justify-center"
          >
            <RotateCcw className="h-4 w-4" />
            {t('crud.resetFilters')}
          </Button>
        )}
      </div>

      {isError && <InlineError message={t('crud.loadError')} />}

      <DataTable
        columns={columns}
        data={data?.items}
        rowKey={(c) => c.id}
        loading={isLoading}
        emptyTitle={t('courses.empty')}
        emptyDescription={t('courses.emptyHint')}
        emptyIcon={<BookOpen className="h-6 w-6" aria-hidden />}
        className={isFetching ? 'opacity-70 transition-opacity' : undefined}
      />

      {data && data.meta.pageCount > 1 && (
        <Pagination
          page={data.meta.page}
          pageCount={data.meta.pageCount}
          onPageChange={setPage}
        />
      )}

      <CourseFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        course={editing}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        title={t('crud.confirmDeleteTitle')}
        description={t('crud.confirmDeleteText', { name: deleting?.name ?? '' })}
        confirmLabel={t('crud.delete')}
      />
    </div>
  );
}
