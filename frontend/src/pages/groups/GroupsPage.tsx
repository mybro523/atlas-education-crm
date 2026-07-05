import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Pencil, Trash2, Boxes } from 'lucide-react';

import { ROUTES } from '@/shared/config';
import { useDebouncedValue } from '@/shared/lib/hooks';
import {
  PageHeader,
  Button,
  Input,
  Select,
  Badge,
  DataTable,
  Pagination,
  ConfirmDialog,
  useToast,
  type DataTableColumn,
} from '@/shared/ui';
import {
  useGroups,
  useDeleteGroup,
  type Group,
} from '@/entities/group';
import { useBranches } from '@/entities/branch';
import { useCourses } from '@/entities/course';
import { useTeachers } from '@/entities/teacher';
import { useCanCrudGroups } from '@/features/manage-group-students';
import { GroupFormModal } from './ui/GroupFormModal';

const PAGE_SIZE = 20;

export function GroupsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const toast = useToast();
  const canCrud = useCanCrudGroups();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [branchId, setBranchId] = useState('');
  const [courseId, setCourseId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim(), 350);

  const { data, isLoading, isError } = useGroups({
    page,
    pageSize: PAGE_SIZE,
    search: debouncedSearch || undefined,
    branchId: branchId || undefined,
    courseId: courseId || undefined,
    teacherId: teacherId || undefined,
  });

  const { data: branches } = useBranches();
  const { data: coursesData } = useCourses({ pageSize: 100 });
  const { data: teachersData } = useTeachers({ pageSize: 100 });

  const deleteGroup = useDeleteGroup();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Group | null>(null);
  const [deleting, setDeleting] = useState<Group | null>(null);

  const groups = data?.items ?? [];
  const pageCount = data?.meta.pageCount ?? 1;

  const resetPage = () => setPage(1);

  const branchOptions = useMemo(
    () => [
      { value: '', label: t('groups.allBranches') },
      ...(branches ?? []).map((b) => ({ value: b.id, label: b.name })),
    ],
    [branches, t],
  );
  const courseOptions = useMemo(
    () => [
      { value: '', label: t('groups.allCourses') },
      ...((coursesData?.items ?? []).map((c) => ({
        value: c.id,
        label: c.name,
      }))),
    ],
    [coursesData, t],
  );
  const teacherOptions = useMemo(
    () => [
      { value: '', label: t('groups.allTeachers') },
      ...((teachersData?.items ?? []).map((te) => ({
        value: te.id,
        label: `${te.lastName} ${te.firstName}`,
      }))),
    ],
    [teachersData, t],
  );

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (group: Group) => {
    setEditing(group);
    setFormOpen(true);
  };

  const handleDelete = () => {
    if (!deleting) return;
    const target = deleting;
    deleteGroup.mutate(target.id, {
      onSuccess: () => toast.success(t('groups.deletedToast')),
      onError: () => toast.error(t('groups.saveError')),
    });
    setDeleting(null);
  };

  const teacherLabel = (group: Group) =>
    group.teacher
      ? `${group.teacher.lastName} ${group.teacher.firstName}`
      : t('groups.fields.noTeacher');

  const columns: DataTableColumn<Group>[] = [
    {
      id: 'name',
      header: t('groups.table.name'),
      cell: (g) => <span className="font-medium text-foreground">{g.name}</span>,
    },
    {
      id: 'course',
      header: t('groups.table.course'),
      cell: (g) => g.course?.name ?? '—',
      hideOnMobile: true,
    },
    {
      id: 'teacher',
      header: t('groups.table.teacher'),
      cell: teacherLabel,
    },
    {
      id: 'branch',
      header: t('groups.table.branch'),
      cell: (g) => g.branch?.name ?? '—',
      hideOnMobile: true,
    },
    {
      id: 'students',
      header: t('groups.table.students'),
      className: 'text-right',
      cell: (g) => g.studentsCount ?? 0,
    },
    {
      id: 'status',
      header: t('groups.table.status'),
      cell: (g) => (
        <Badge variant={g.isActive ? 'success' : 'muted'} dot>
          {g.isActive
            ? t('groups.status.active')
            : t('groups.status.inactive')}
        </Badge>
      ),
    },
    ...(canCrud
      ? [
          {
            id: 'actions',
            header: t('groups.table.actions'),
            className: 'text-right',
            cell: (g: Group) => (
              <div
                className="flex items-center justify-end gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={t('common.edit')}
                  onClick={() => openEdit(g)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={t('common.delete')}
                  onClick={() => setDeleting(g)}
                >
                  <Trash2 className="h-4 w-4 text-danger" />
                </Button>
              </div>
            ),
          } as DataTableColumn<Group>,
        ]
      : []),
  ];

  return (
    <div>
      <PageHeader
        title={t('groups.title')}
        description={t('groups.subtitle')}
        actions={
          canCrud ? (
            <Button type="button" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              {t('groups.create')}
            </Button>
          ) : undefined
        }
      />

      {/* Filters */}
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            resetPage();
          }}
          placeholder={t('groups.searchPlaceholder')}
          leftIcon={<Search className="h-4 w-4" />}
          aria-label={t('common.search')}
        />
        <Select
          options={branchOptions}
          value={branchId}
          onChange={(e) => {
            setBranchId(e.target.value);
            resetPage();
          }}
          aria-label={t('groups.fields.branch')}
        />
        <Select
          options={courseOptions}
          value={courseId}
          onChange={(e) => {
            setCourseId(e.target.value);
            resetPage();
          }}
          aria-label={t('groups.fields.course')}
        />
        <Select
          options={teacherOptions}
          value={teacherId}
          onChange={(e) => {
            setTeacherId(e.target.value);
            resetPage();
          }}
          aria-label={t('groups.fields.teacher')}
        />
      </div>

      <DataTable
        columns={columns}
        data={groups}
        rowKey={(g) => g.id}
        loading={isLoading}
        onRowClick={(g) => navigate(`${ROUTES.groups}/${g.id}`)}
        emptyTitle={isError ? t('form.loadError') : t('groups.empty')}
        emptyDescription={isError ? undefined : t('groups.emptyHint')}
        emptyIcon={<Boxes className="h-6 w-6" aria-hidden />}
      />

      {pageCount > 1 && (
        <div className="mt-5">
          <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
        </div>
      )}

      <GroupFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        group={editing}
        onSaved={(created) =>
          toast.success(
            created ? t('groups.createdToast') : t('groups.updatedToast'),
          )
        }
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title={t('groups.deleteTitle')}
        description={t('groups.deleteConfirm', { name: deleting?.name ?? '' })}
        confirmLabel={t('common.delete')}
      />
    </div>
  );
}
