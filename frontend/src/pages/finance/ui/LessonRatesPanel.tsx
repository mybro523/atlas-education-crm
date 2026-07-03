import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Trash2, Tag } from 'lucide-react';

import {
  Card,
  CardTitle,
  CardDescription,
  Button,
  Badge,
  DataTable,
  ConfirmDialog,
  useToast,
  type DataTableColumn,
} from '@/shared/ui';
import { extractErrorMessage } from '@/shared/api';
import { useGroups } from '@/entities/group';
import {
  useLessonRates,
  useDeleteLessonRate,
  type LessonRate,
} from '@/entities/lesson-rate';
import { LessonRateFormModal } from '@/features/compute-salary';
import { formatMoney } from '@/shared/lib';

/**
 * Lesson pay-rate dictionary (API_CONTRACT §14.2). Global or per-group rates
 * feed the per-lesson salary computation. CRUD is optimistic.
 */
export function LessonRatesPanel() {
  const { t } = useTranslation();
  const toast = useToast();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<LessonRate | null>(null);
  const [pendingDelete, setPendingDelete] = useState<LessonRate | null>(null);

  const { data: rates, isLoading, isError } = useLessonRates();
  const { data: groupsData } = useGroups({ pageSize: 100 });
  const deleteRate = useDeleteLessonRate();

  const groupName = (id?: string | null) =>
    id
      ? (groupsData?.items ?? []).find((g) => g.id === id)?.name ??
        t('finance.rates.someGroup')
      : null;

  const confirmDelete = () => {
    if (!pendingDelete) return;
    deleteRate.mutate(pendingDelete.id, {
      onSuccess: () => toast.success(t('finance.rates.deleted')),
      onError: (err) =>
        toast.error(extractErrorMessage(err) ?? t('form.deleteError')),
    });
    setPendingDelete(null);
  };

  const columns: DataTableColumn<LessonRate>[] = [
    {
      id: 'name',
      header: t('finance.rates.name'),
      cell: (r) => (
        <span className="font-medium text-foreground">
          {r.name || t('finance.rates.unnamed')}
        </span>
      ),
    },
    {
      id: 'scope',
      header: t('finance.rates.scope'),
      cell: (r) =>
        r.groupId ? (
          <Badge variant="primary">{groupName(r.groupId)}</Badge>
        ) : (
          <Badge variant="muted">{t('finance.rates.global')}</Badge>
        ),
    },
    {
      id: 'amount',
      header: t('finance.rates.amount'),
      className: 'text-right',
      headerClassName: 'text-right',
      cell: (r) => (
        <span className="font-semibold tabular-nums">
          {formatMoney(r.amount)}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      mobileLabel: t('crud.actions'),
      headerClassName: 'text-right',
      className: 'text-right',
      cell: (r) => (
        <div className="flex justify-end gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t('actions.edit')}
            onClick={() => {
              setEditing(r);
              setFormOpen(true);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t('actions.delete')}
            onClick={() => setPendingDelete(r)}
            className="text-danger hover:bg-danger/10"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <Card>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <CardTitle>{t('finance.rates.title')}</CardTitle>
          <CardDescription>{t('finance.rates.subtitle')}</CardDescription>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
          className="self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          {t('finance.rates.add')}
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={rates}
        rowKey={(r) => r.id}
        loading={isLoading}
        skeletonRows={3}
        emptyIcon={<Tag className="h-6 w-6" aria-hidden />}
        emptyTitle={isError ? t('crud.loadError') : t('finance.rates.empty')}
        emptyDescription={isError ? undefined : t('finance.rates.emptyHint')}
      />

      <LessonRateFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        rate={editing}
      />
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        title={t('finance.rates.deleteTitle')}
        description={t('finance.rates.deleteConfirm')}
        confirmLabel={t('actions.delete')}
        confirming={deleteRate.isPending}
      />
    </Card>
  );
}
