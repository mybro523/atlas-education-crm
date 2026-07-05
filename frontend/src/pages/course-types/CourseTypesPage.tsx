import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Trash2, Layers, Search } from 'lucide-react';

import {
  Badge,
  Button,
  ConfirmDialog,
  DataTable,
  InlineError,
  Input,
  PageHeader,
  Select,
  useToast,
  type DataTableColumn,
} from '@/shared/ui';
import {
  useCourseTypes,
  useDeleteCourseType,
  type CourseType,
  type CourseTypeListParams,
} from '@/entities/course-type';
import { CourseTypeFormModal } from '@/features/manage-course-type';

type ActiveFilter = 'all' | 'active' | 'inactive';

/** Admin CRUD screen for CourseTypes (dictionary; `active` filter + search). */
export function CourseTypesPage() {
  const { t } = useTranslation();
  const toast = useToast();

  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all');
  const [search, setSearch] = useState('');

  // Server-side `?active` filter (contract §3); search is client-side.
  const params: CourseTypeListParams | undefined =
    activeFilter === 'all' ? undefined : { active: activeFilter === 'active' };
  const { data, isLoading, isError } = useCourseTypes(params);
  const deleteCourseType = useDeleteCourseType();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CourseType | null>(null);
  const [deleting, setDeleting] = useState<CourseType | null>(null);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (ct: CourseType) => {
    setEditing(ct);
    setFormOpen(true);
  };

  const confirmDelete = () => {
    if (!deleting) return;
    deleteCourseType.mutate(deleting.id, {
      onSuccess: () => toast.success(t('crud.deleted')),
      onError: () => toast.error(t('crud.deleteError')),
    });
    setDeleting(null);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return (data ?? []).filter((ct) => ct.name.toLowerCase().includes(q));
  }, [data, search]);

  const columns = useMemo<DataTableColumn<CourseType>[]>(
    () => [
      {
        id: 'name',
        header: t('courseTypes.name'),
        cell: (ct) => (
          <span className="font-medium text-foreground">{ct.name}</span>
        ),
      },
      {
        id: 'status',
        header: t('fields.status'),
        mobileLabel: t('fields.status'),
        cell: (ct) => (
          <Badge variant={ct.isActive ? 'success' : 'muted'} dot>
            {ct.isActive ? t('status.active') : t('status.inactive')}
          </Badge>
        ),
      },
      {
        id: 'actions',
        header: <span className="sr-only">{t('crud.actions')}</span>,
        className: 'text-right',
        mobileLabel: t('crud.actions'),
        cell: (ct) => (
          <div className="flex items-center justify-end gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('crud.edit')}
              onClick={() => openEdit(ct)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('crud.delete')}
              onClick={() => setDeleting(ct)}
            >
              <Trash2 className="h-4 w-4 text-danger" />
            </Button>
          </div>
        ),
      },
    ],
    [t],
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('courseTypes.title')}
        description={t('courseTypes.subtitle')}
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            {t('courseTypes.add')}
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="sm:max-w-xs sm:flex-1">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('crud.searchPlaceholder')}
            leftIcon={<Search className="h-4 w-4" />}
            aria-label={t('common.search')}
          />
        </div>
        <div className="sm:w-48">
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
        </div>
      </div>

      {isError && <InlineError message={t('crud.loadError')} />}

      <DataTable
        columns={columns}
        data={filtered}
        rowKey={(ct) => ct.id}
        loading={isLoading}
        emptyTitle={t('courseTypes.empty')}
        emptyDescription={t('courseTypes.emptyHint')}
        emptyIcon={<Layers className="h-6 w-6" aria-hidden />}
      />

      <CourseTypeFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        courseType={editing}
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
