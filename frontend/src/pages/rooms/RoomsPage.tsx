import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Trash2, DoorOpen, Search } from 'lucide-react';

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
import { ROLES } from '@/shared/config';
import { isOptimisticId } from '@/shared/lib';
import { useSessionStore, selectRole } from '@/entities/session';
import { useBranches } from '@/entities/branch';
import {
  useRooms,
  useDeleteRoom,
  type Room,
  type RoomListParams,
} from '@/entities/room';
import { RoomFormModal } from './ui/RoomFormModal';

type ActiveFilter = 'all' | 'active' | 'inactive';

/**
 * Admin CRUD screen for Rooms / kabinets (flexible dictionary). Reads are open
 * to any authenticated user; write controls are gated to ADMIN + FOUNDER
 * (mirrors the backend RBAC). `active` filter is server-side; search is local.
 */
export function RoomsPage() {
  const { t } = useTranslation();
  const toast = useToast();

  const role = useSessionStore(selectRole);
  const canManage = role === ROLES.ADMIN || role === ROLES.FOUNDER;

  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all');
  const [search, setSearch] = useState('');

  // Server-side `?active` filter; search is client-side over the dictionary.
  const params: RoomListParams | undefined =
    activeFilter === 'all' ? undefined : { active: activeFilter === 'active' };
  const { data, isLoading, isError } = useRooms(params);
  const deleteRoom = useDeleteRoom();

  const { data: branches } = useBranches();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Room | null>(null);
  const [deleting, setDeleting] = useState<Room | null>(null);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (room: Room) => {
    if (isOptimisticId(room.id)) return;
    setEditing(room);
    setFormOpen(true);
  };

  const confirmDelete = () => {
    if (!deleting) return;
    if (isOptimisticId(deleting.id)) return;
    deleteRoom.mutate(deleting.id, {
      onSuccess: () => toast.success(t('crud.deleted')),
      onError: () => toast.error(t('crud.deleteError')),
    });
    setDeleting(null);
  };

  // Resolve branch names locally (the list endpoint omits the relation).
  const branchName = useMemo(() => {
    const map = new Map((branches ?? []).map((b) => [b.id, b.name]));
    return (r: Room) =>
      r.branch?.name ?? (r.branchId ? map.get(r.branchId) : undefined) ?? null;
  }, [branches]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return (data ?? []).filter((r) => r.name.toLowerCase().includes(q));
  }, [data, search]);

  const columns = useMemo<DataTableColumn<Room>[]>(() => {
    const base: DataTableColumn<Room>[] = [
      {
        id: 'name',
        header: t('rooms.name'),
        cell: (r) => (
          <span className="font-medium text-foreground">{r.name}</span>
        ),
      },
      {
        id: 'branch',
        header: t('rooms.branch'),
        mobileLabel: t('rooms.branch'),
        cell: (r) => {
          const name = branchName(r);
          return name ? (
            <span className="text-foreground-muted">{name}</span>
          ) : (
            <span className="text-foreground-muted">{t('rooms.noBranch')}</span>
          );
        },
      },
      {
        id: 'status',
        header: t('fields.status'),
        mobileLabel: t('fields.status'),
        cell: (r) => (
          <Badge variant={r.isActive ? 'success' : 'muted'} dot>
            {r.isActive ? t('status.active') : t('status.inactive')}
          </Badge>
        ),
      },
    ];

    if (!canManage) return base;

    return [
      ...base,
      {
        id: 'actions',
        header: <span className="sr-only">{t('crud.actions')}</span>,
        className: 'text-right',
        mobileLabel: t('crud.actions'),
        cell: (r) => (
          <div className="flex items-center justify-end gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('crud.edit')}
              disabled={isOptimisticId(r.id)}
              onClick={() => openEdit(r)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('crud.delete')}
              disabled={isOptimisticId(r.id)}
              onClick={() => setDeleting(r)}
            >
              <Trash2 className="h-4 w-4 text-danger" />
            </Button>
          </div>
        ),
      },
    ];
  }, [t, branchName, canManage]);

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('rooms.title')}
        description={t('rooms.subtitle')}
        actions={
          canManage ? (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              {t('rooms.add')}
            </Button>
          ) : undefined
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
        rowKey={(r) => r.id}
        loading={isLoading}
        emptyTitle={t('rooms.empty')}
        emptyDescription={t('rooms.emptyHint')}
        emptyIcon={<DoorOpen className="h-6 w-6" aria-hidden />}
      />

      {canManage && (
        <>
          <RoomFormModal
            open={formOpen}
            onClose={() => setFormOpen(false)}
            room={editing}
          />

          <ConfirmDialog
            open={Boolean(deleting)}
            onClose={() => setDeleting(null)}
            onConfirm={confirmDelete}
            title={t('crud.confirmDeleteTitle')}
            description={t('crud.confirmDeleteText', {
              name: deleting?.name ?? '',
            })}
            confirmLabel={t('crud.delete')}
          />
        </>
      )}
    </div>
  );
}
