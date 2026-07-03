import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Trash2, Library, Search } from 'lucide-react';

import {
  Button,
  ConfirmDialog,
  DataTable,
  InlineError,
  Input,
  PageHeader,
  useToast,
  type DataTableColumn,
} from '@/shared/ui';
import { useSubjects, useDeleteSubject, type Subject } from '@/entities/subject';
import { SubjectFormModal } from '@/features/manage-subject';

/** Admin CRUD screen for Subjects (dictionary; client-side search). */
export function SubjectsPage() {
  const { t } = useTranslation();
  const toast = useToast();

  const { data, isLoading, isError } = useSubjects();
  const deleteSubject = useDeleteSubject();

  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [deleting, setDeleting] = useState<Subject | null>(null);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (subject: Subject) => {
    setEditing(subject);
    setFormOpen(true);
  };

  const confirmDelete = () => {
    if (!deleting) return;
    deleteSubject.mutate(deleting.id, {
      onSuccess: () => toast.success(t('crud.deleted')),
      onError: () => toast.error(t('crud.deleteError')),
    });
    setDeleting(null);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return (data ?? []).filter((s) => s.name.toLowerCase().includes(q));
  }, [data, search]);

  const columns = useMemo<DataTableColumn<Subject>[]>(
    () => [
      {
        id: 'name',
        header: t('subjects.name'),
        cell: (s) => <span className="font-medium text-foreground">{s.name}</span>,
      },
      {
        id: 'actions',
        header: <span className="sr-only">{t('crud.actions')}</span>,
        className: 'text-right',
        mobileLabel: t('crud.actions'),
        cell: (s) => (
          <div className="flex items-center justify-end gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('crud.edit')}
              onClick={() => openEdit(s)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('crud.delete')}
              onClick={() => setDeleting(s)}
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
        title={t('subjects.title')}
        description={t('subjects.subtitle')}
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            {t('crud.add')}
          </Button>
        }
      />

      <div className="max-w-xs">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('crud.searchPlaceholder')}
          leftIcon={<Search className="h-4 w-4" />}
          aria-label={t('common.search')}
        />
      </div>

      {isError && <InlineError message={t('crud.loadError')} />}

      <DataTable
        columns={columns}
        data={filtered}
        rowKey={(s) => s.id}
        loading={isLoading}
        emptyTitle={t('subjects.empty')}
        emptyDescription={t('subjects.emptyHint')}
        emptyIcon={<Library className="h-6 w-6" aria-hidden />}
      />

      <SubjectFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        subject={editing}
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
