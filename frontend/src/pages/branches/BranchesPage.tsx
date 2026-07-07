import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Trash2, Building2, Phone, MapPin } from 'lucide-react';

import {
  Button,
  ConfirmDialog,
  DataTable,
  InlineError,
  PageHeader,
  useToast,
  type DataTableColumn,
} from '@/shared/ui';
import { isOptimisticId } from '@/shared/lib';
import { useBranches, useDeleteBranch, type Branch } from '@/entities/branch';
import { BranchFormModal } from '@/features/manage-branch';

/** Admin CRUD screen for Branches (dictionary; plain array, no pagination). */
export function BranchesPage() {
  const { t } = useTranslation();
  const toast = useToast();

  const { data, isLoading, isError } = useBranches();
  const deleteBranch = useDeleteBranch();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [deleting, setDeleting] = useState<Branch | null>(null);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (branch: Branch) => {
    if (isOptimisticId(branch.id)) return;
    setEditing(branch);
    setFormOpen(true);
  };

  const confirmDelete = () => {
    if (!deleting) return;
    const target = deleting;
    if (isOptimisticId(target.id)) {
      setDeleting(null);
      return;
    }
    deleteBranch.mutate(target.id, {
      onSuccess: () => toast.success(t('crud.deleted')),
      onError: () => toast.error(t('crud.deleteError')),
    });
    setDeleting(null);
  };

  const columns = useMemo<DataTableColumn<Branch>[]>(
    () => [
      {
        id: 'name',
        header: t('branches.name'),
        sortValue: (b) => b.name,
        cell: (b) => <span className="font-medium text-foreground">{b.name}</span>,
      },
      {
        id: 'address',
        header: t('branches.address'),
        sortValue: (b) => b.address ?? null,
        cell: (b) =>
          b.address ? (
            <span className="inline-flex items-center gap-1.5 text-foreground-muted">
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {b.address}
            </span>
          ) : (
            <span className="text-foreground-muted">—</span>
          ),
      },
      {
        id: 'phone',
        header: t('branches.phone'),
        sortValue: (b) => b.phone ?? null,
        cell: (b) =>
          b.phone ? (
            <span className="inline-flex items-center gap-1.5 text-foreground-muted">
              <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {b.phone}
            </span>
          ) : (
            <span className="text-foreground-muted">—</span>
          ),
      },
      {
        id: 'actions',
        header: <span className="sr-only">{t('crud.actions')}</span>,
        className: 'text-right',
        mobileLabel: t('crud.actions'),
        cell: (b) => (
          <div className="flex items-center justify-end gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('crud.edit')}
              disabled={isOptimisticId(b.id)}
              onClick={() => openEdit(b)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('crud.delete')}
              disabled={isOptimisticId(b.id)}
              onClick={() => setDeleting(b)}
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
        title={t('branches.title')}
        description={t('branches.subtitle')}
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            {t('branches.add')}
          </Button>
        }
      />

      {isError && <InlineError message={t('crud.loadError')} />}

      <DataTable
        columns={columns}
        data={data}
        rowKey={(b) => b.id}
        loading={isLoading}
        emptyTitle={t('branches.empty')}
        emptyDescription={t('branches.emptyHint')}
        emptyIcon={<Building2 className="h-6 w-6" aria-hidden />}
      />

      <BranchFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        branch={editing}
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
