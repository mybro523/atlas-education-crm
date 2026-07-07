import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyRound, Lock, Plus, Trash2, Unlock, Users } from 'lucide-react';
import {
  Badge,
  Button,
  ConfirmDialog,
  DataTable,
  PageHeader,
  useToast,
  type DataTableColumn,
} from '@/shared/ui';
import { formatDate, isOptimisticId } from '@/shared/lib';
import { extractErrorMessage } from '@/shared/api';
import {
  useDeleteStaff,
  useSetStaffBlocked,
  useStaff,
  type StaffUser,
} from '@/entities/staff';
import { EmployeeFormModal } from './ui/EmployeeFormModal';
import { ResetPasswordModal } from './ui/ResetPasswordModal';
import {
  CredentialsModal,
  type IssuedCredentials,
} from './ui/CredentialsModal';

/**
 * Founder-only staff administration: create accounts (with login + password),
 * reset passwords, block/unblock and delete. All mutations are optimistic —
 * modals close instantly, the table reflects the change at once, and issued
 * credentials pop up in a copyable panel after the server confirms.
 */
export function EmployeesPage() {
  const { t } = useTranslation();
  const toast = useToast();

  const { data: staff, isLoading, isError } = useStaff();
  const setBlocked = useSetStaffBlocked();
  const deleteStaff = useDeleteStaff();

  const [createOpen, setCreateOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<StaffUser | null>(null);
  const [pendingBlock, setPendingBlock] = useState<StaffUser | null>(null);
  const [pendingDelete, setPendingDelete] = useState<StaffUser | null>(null);
  const [credentials, setCredentials] = useState<IssuedCredentials | null>(
    null,
  );

  const openReset = (user: StaffUser) => {
    if (isOptimisticId(user.id)) return;
    setResetTarget(user);
  };

  const requestBlockToggle = (user: StaffUser) => {
    if (isOptimisticId(user.id) || user.role === 'FOUNDER') return;
    setPendingBlock(user);
  };

  const confirmBlockToggle = () => {
    if (!pendingBlock) return;
    const user = pendingBlock;
    setPendingBlock(null);
    if (isOptimisticId(user.id)) return;
    const blocked = user.isActive; // active → block; blocked → unblock
    setBlocked.mutate(
      { id: user.id, blocked },
      {
        onSuccess: () =>
          toast.success(
            blocked ? t('employees.blocked') : t('employees.unblocked'),
          ),
        onError: (err) =>
          toast.error(extractErrorMessage(err) ?? t('form.saveError')),
      },
    );
  };

  const requestDelete = (user: StaffUser) => {
    if (isOptimisticId(user.id) || user.role === 'FOUNDER') return;
    setPendingDelete(user);
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    const user = pendingDelete;
    setPendingDelete(null);
    if (isOptimisticId(user.id)) return;
    deleteStaff.mutate(user.id, {
      onSuccess: () => toast.success(t('employees.deleted')),
      onError: (err) =>
        toast.error(extractErrorMessage(err) ?? t('form.deleteError')),
    });
  };

  const columns: DataTableColumn<StaffUser>[] = [
    {
      id: 'name',
      header: `${t('fields.lastName')} / ${t('fields.firstName')}`,
      mobileLabel: t('fields.firstName'),
      sortValue: (u) => u.fullName,
      cell: (u) => (
        <div className="min-w-0">
          <p className="font-medium text-foreground">{u.fullName}</p>
          {u.position && (
            <p className="truncate text-xs text-foreground-muted">
              {u.position}
            </p>
          )}
        </div>
      ),
    },
    {
      id: 'login',
      header: t('fields.login'),
      sortValue: (u) => u.email,
      cell: (u) => <span className="break-all">{u.email ?? '—'}</span>,
    },
    {
      id: 'role',
      header: t('employees.role'),
      sortValue: (u) => t(`roles.${u.role}`),
      cell: (u) =>
        u.role === 'FOUNDER' ? (
          <Badge variant="primary">{t(`roles.${u.role}`)}</Badge>
        ) : (
          t(`roles.${u.role}`)
        ),
    },
    {
      id: 'branch',
      header: t('fields.branch'),
      cell: (u) => u.branch?.name ?? '—',
    },
    {
      id: 'createdAt',
      header: t('crud.createdAt'),
      sortValue: (u) => u.createdAt,
      cell: (u) => formatDate(u.createdAt),
      // Secondary info: only shown when the desktop viewport has room.
      className: 'hidden lg:table-cell',
      hideOnMobile: true,
    },
    {
      id: 'status',
      header: t('employees.status'),
      sortValue: (u) => (u.isActive ? 0 : 1),
      cell: (u) =>
        u.isActive ? (
          <Badge variant="success" dot>
            {t('employees.active')}
          </Badge>
        ) : (
          <Badge variant="danger" dot>
            {t('employees.blockedBadge')}
          </Badge>
        ),
    },
    {
      id: 'actions',
      header: '',
      mobileLabel: t('crud.actions'),
      headerClassName: 'text-right',
      className: 'text-right',
      cell: (u) => (
        <div className="flex justify-end gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t('employees.resetPassword')}
            title={t('employees.resetPassword')}
            disabled={isOptimisticId(u.id)}
            onClick={() => openReset(u)}
          >
            <KeyRound className="h-4 w-4" />
          </Button>
          {u.role !== 'FOUNDER' && (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={
                  u.isActive ? t('employees.block') : t('employees.unblock')
                }
                title={
                  u.isActive ? t('employees.block') : t('employees.unblock')
                }
                disabled={isOptimisticId(u.id)}
                onClick={() => requestBlockToggle(u)}
              >
                {u.isActive ? (
                  <Lock className="h-4 w-4" />
                ) : (
                  <Unlock className="h-4 w-4" />
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={t('actions.delete')}
                title={t('actions.delete')}
                disabled={isOptimisticId(u.id)}
                onClick={() => requestDelete(u)}
                className="text-danger hover:bg-danger/10"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={t('employees.title')}
        description={t('employees.subtitle')}
        actions={
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            {t('employees.add')}
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={staff}
        rowKey={(u) => u.id}
        loading={isLoading}
        emptyTitle={isError ? t('crud.loadError') : t('employees.empty')}
        emptyDescription={isError ? undefined : t('employees.emptyHint')}
        emptyIcon={<Users className="h-8 w-8" aria-hidden />}
      />

      {!isLoading && (staff?.length ?? 0) > 0 && (
        <p className="mt-4 text-sm text-foreground-muted">
          {t('employees.count', { count: staff?.length ?? 0 })}
        </p>
      )}

      <EmployeeFormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={setCredentials}
      />

      <ResetPasswordModal
        user={resetTarget}
        onClose={() => setResetTarget(null)}
        onReset={setCredentials}
      />

      <CredentialsModal
        credentials={credentials}
        onClose={() => setCredentials(null)}
      />

      <ConfirmDialog
        open={Boolean(pendingBlock)}
        onClose={() => setPendingBlock(null)}
        onConfirm={confirmBlockToggle}
        title={
          pendingBlock?.isActive
            ? t('employees.block')
            : t('employees.unblock')
        }
        description={pendingBlock?.fullName}
        confirmLabel={
          pendingBlock?.isActive
            ? t('employees.block')
            : t('employees.unblock')
        }
        variant={pendingBlock?.isActive ? 'danger' : 'primary'}
        confirming={setBlocked.isPending}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        title={t('employees.deleteTitle')}
        description={t('employees.deleteConfirm', {
          name: pendingDelete?.fullName ?? '',
        })}
        confirmLabel={t('actions.delete')}
        confirming={deleteStaff.isPending}
      />
    </div>
  );
}
