import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, Plus, Trash2, Users } from 'lucide-react';

import { ROUTES } from '@/shared/config';
import {
  PageHeader,
  Button,
  Badge,
  Card,
  Spinner,
  DataTable,
  ConfirmDialog,
  EmptyState,
  useToast,
  type DataTableColumn,
} from '@/shared/ui';
import {
  useGroup,
  useGroupStudents,
  useRemoveGroupStudent,
  type GroupStudent,
} from '@/entities/group';
import {
  AddStudentModal,
  useCanManageGroup,
} from '@/features/manage-group-students';

export function GroupDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const toast = useToast();
  const { id } = useParams<{ id: string }>();

  const { data: group, isLoading: groupLoading } = useGroup(id);
  const { data: members, isLoading: membersLoading } = useGroupStudents(id);
  const removeStudent = useRemoveGroupStudent();
  const canManage = useCanManageGroup(id);

  const [addOpen, setAddOpen] = useState(false);
  const [removing, setRemoving] = useState<GroupStudent | null>(null);

  const existingStudentIds = useMemo(
    () => (members ?? []).map((m) => m.studentId),
    [members],
  );

  const handleRemove = () => {
    if (!removing || !id) return;
    removeStudent.mutate(
      { groupId: id, studentId: removing.studentId },
      {
        onSuccess: () => toast.success(t('groups.detail.removedToast')),
        onError: () => toast.error(t('groups.saveError')),
      },
    );
    setRemoving(null);
  };

  const memberName = (m: GroupStudent) =>
    m.student
      ? `${m.student.lastName} ${m.student.firstName}`
      : m.studentId;

  const columns: DataTableColumn<GroupStudent>[] = [
    {
      id: 'name',
      header: t('groups.detail.students'),
      cell: (m) => (
        <span className="font-medium text-foreground">{memberName(m)}</span>
      ),
    },
    {
      id: 'phone',
      header: t('groups.detail.phone'),
      cell: (m) => m.student?.phone ?? '—',
    },
    ...(canManage
      ? [
          {
            id: 'actions',
            header: t('groups.table.actions'),
            className: 'text-right',
            cell: (m: GroupStudent) => (
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setRemoving(m)}
                >
                  <Trash2 className="h-4 w-4 text-danger" />
                  <span className="hidden sm:inline">
                    {t('groups.detail.removeStudent')}
                  </span>
                </Button>
              </div>
            ),
          } as DataTableColumn<GroupStudent>,
        ]
      : []),
  ];

  if (groupLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    );
  }

  if (!group) {
    return (
      <div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => navigate(ROUTES.groups)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('groups.detail.back')}
        </Button>
        <EmptyState
          title={t('groups.detail.notFound')}
          icon={<Users className="h-6 w-6" aria-hidden />}
        />
      </div>
    );
  }

  return (
    <div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => navigate(ROUTES.groups)}
        className="mb-3"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('groups.detail.back')}
      </Button>

      <PageHeader
        title={group.name}
        description={group.course?.name}
        actions={
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              navigate(`${ROUTES.schedule}?groupId=${group.id}`)
            }
          >
            <CalendarDays className="h-4 w-4" />
            {t('groups.detail.openSchedule')}
          </Button>
        }
      />

      {/* Group summary */}
      <Card flush className="mb-5">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 p-4 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-xs uppercase tracking-wide text-foreground-muted">
              {t('groups.table.course')}
            </dt>
            <dd className="mt-0.5 text-foreground">
              {group.course?.name ?? '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-foreground-muted">
              {t('groups.table.teacher')}
            </dt>
            <dd className="mt-0.5 text-foreground">
              {group.teacher
                ? `${group.teacher.lastName} ${group.teacher.firstName}`
                : t('groups.fields.noTeacher')}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-foreground-muted">
              {t('groups.table.branch')}
            </dt>
            <dd className="mt-0.5 text-foreground">
              {group.branch?.name ?? '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-foreground-muted">
              {t('groups.table.status')}
            </dt>
            <dd className="mt-0.5">
              <Badge variant={group.isActive ? 'success' : 'muted'} dot>
                {group.isActive
                  ? t('groups.status.active')
                  : t('groups.status.inactive')}
              </Badge>
            </dd>
          </div>
        </dl>
      </Card>

      {/* Students */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground">
          {t('groups.detail.students')}
        </h2>
        {canManage && (
          <Button type="button" size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" />
            {t('groups.detail.addStudent')}
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={members}
        rowKey={(m) => m.id}
        loading={membersLoading}
        emptyTitle={t('groups.detail.emptyStudents')}
        emptyDescription={t('groups.detail.emptyStudentsHint')}
        emptyIcon={<Users className="h-6 w-6" aria-hidden />}
      />

      {canManage && id && (
        <AddStudentModal
          open={addOpen}
          onClose={() => setAddOpen(false)}
          groupId={id}
          branchId={group.branchId}
          existingStudentIds={existingStudentIds}
        />
      )}

      <ConfirmDialog
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        onConfirm={handleRemove}
        title={t('groups.detail.removeTitle')}
        description={t('groups.detail.removeConfirm', {
          name: removing ? memberName(removing) : '',
        })}
        confirmLabel={t('groups.detail.removeStudent')}
      />
    </div>
  );
}
