import { useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Building2,
  CalendarPlus,
  Lock,
  LockOpen,
  Pencil,
  Trash2,
  Users,
  Wallet,
} from 'lucide-react';

import {
  AnimatedNumber,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  DataTable,
  FormModal,
  Input,
  PageHeader,
  Textarea,
  useToast,
  type DataTableColumn,
} from '@/shared/ui';
import { formatMoney, toNumber } from '@/shared/lib/format';
import {
  useAcademies,
  useAcademyPayments,
  useCreateAcademy,
  useDeleteAcademy,
  useExtendAcademy,
  useSetAcademyStatus,
  useUpdateAcademy,
  type Academy,
} from '@/entities/academy';

const dateFmt = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString() : '—';

/** Days until the subscription ends (negative = already expired). */
function daysLeft(a: Academy): number {
  return Math.floor(
    (new Date(a.subscriptionEnd).getTime() - Date.now()) / 86_400_000,
  );
}

/**
 * SaaS owner panel: every client academy with its subscription term, usage
 * stats and the sales ledger. OWNER role only (route-guarded).
 */
export function OwnerPage() {
  const { t } = useTranslation();
  const toast = useToast();

  const { data: academies, isLoading } = useAcademies();
  const { data: ledger } = useAcademyPayments();

  const createAcademy = useCreateAcademy();
  const extendAcademy = useExtendAcademy();
  const updateAcademy = useUpdateAcademy();
  const setStatus = useSetAcademyStatus();
  const deleteAcademy = useDeleteAcademy();

  const [createOpen, setCreateOpen] = useState(false);
  const [extending, setExtending] = useState<Academy | null>(null);
  const [editing, setEditing] = useState<Academy | null>(null);
  const [blocking, setBlocking] = useState<Academy | null>(null);
  const [deleting, setDeleting] = useState<Academy | null>(null);

  const rows = academies ?? [];
  const activeCount = rows.filter(
    (a) => a.status === 'ACTIVE' && daysLeft(a) >= 0,
  ).length;

  const columns = useMemo<DataTableColumn<Academy>[]>(
    () => [
      {
        id: 'name',
        header: t('owner.fields.name'),
        cell: (a) => (
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{a.name}</p>
            <p className="truncate text-xs text-foreground-muted">
              {a.contactName ?? '—'}
              {a.contactPhone ? ` · ${a.contactPhone}` : ''}
            </p>
          </div>
        ),
      },
      {
        id: 'term',
        header: t('owner.fields.term'),
        cell: (a) => {
          const left = daysLeft(a);
          return (
            <div>
              <p className="text-sm tabular-nums">
                {dateFmt(a.subscriptionStart)} — {dateFmt(a.subscriptionEnd)}
              </p>
              <p
                className={
                  left < 0
                    ? 'text-xs font-medium text-danger'
                    : left <= 7
                      ? 'text-xs font-medium text-amber-600'
                      : 'text-xs text-foreground-muted'
                }
              >
                {left < 0
                  ? t('owner.term.expired')
                  : t('owner.term.daysLeft', { count: left })}
              </p>
            </div>
          );
        },
      },
      {
        id: 'status',
        header: t('owner.fields.status'),
        cell: (a) =>
          a.status === 'BLOCKED' ? (
            <Badge variant="danger">{t('owner.status.BLOCKED')}</Badge>
          ) : daysLeft(a) < 0 ? (
            <Badge variant="warning">{t('owner.status.EXPIRED')}</Badge>
          ) : (
            <Badge variant="success">{t('owner.status.ACTIVE')}</Badge>
          ),
      },
      {
        id: 'usage',
        header: t('owner.fields.usage'),
        cell: (a) => (
          <p className="text-sm tabular-nums text-foreground-muted">
            {t('owner.usage.line', {
              students: a.stats?.students ?? 0,
              teachers: a.stats?.teachers ?? 0,
              users: a.stats?.users ?? 0,
            })}
          </p>
        ),
      },
      {
        id: 'revenue',
        header: t('owner.fields.revenue'),
        className: 'text-right',
        cell: (a) => (
          <span className="font-medium tabular-nums">
            {formatMoney(toNumber(a.stats?.revenue ?? 0))}
          </span>
        ),
      },
      {
        id: 'lastLogin',
        header: t('owner.fields.lastLogin'),
        cell: (a) => (
          <span className="text-sm text-foreground-muted">
            {dateFmt(a.stats?.lastLoginAt)}
          </span>
        ),
      },
      {
        id: 'actions',
        header: <span className="sr-only">{t('crud.actions')}</span>,
        className: 'text-right',
        mobileLabel: t('crud.actions'),
        cell: (a) => (
          <div className="flex items-center justify-end gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('owner.actions.extend')}
              title={t('owner.actions.extend')}
              onClick={() => setExtending(a)}
            >
              <CalendarPlus className="h-4 w-4 text-primary" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={
                a.status === 'BLOCKED'
                  ? t('owner.actions.unblock')
                  : t('owner.actions.block')
              }
              title={
                a.status === 'BLOCKED'
                  ? t('owner.actions.unblock')
                  : t('owner.actions.block')
              }
              onClick={() => setBlocking(a)}
            >
              {a.status === 'BLOCKED' ? (
                <LockOpen className="h-4 w-4 text-success" />
              ) : (
                <Lock className="h-4 w-4 text-amber-600" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('crud.edit')}
              onClick={() => setEditing(a)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('crud.delete')}
              onClick={() => setDeleting(a)}
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
        title={t('owner.title')}
        description={t('owner.subtitle')}
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Building2 className="h-4 w-4" />
            {t('owner.actions.create')}
          </Button>
        }
      />

      {/* KPI strip */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Building2 className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-foreground-muted">
              {t('owner.kpi.clients')}
            </p>
            <p className="text-xl font-semibold">
              <AnimatedNumber value={rows.length} />
            </p>
          </div>
        </Card>
        <Card className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10 text-success">
            <Users className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-foreground-muted">
              {t('owner.kpi.active')}
            </p>
            <p className="text-xl font-semibold">
              <AnimatedNumber value={activeCount} />
            </p>
          </div>
        </Card>
        <Card className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
            <Wallet className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-foreground-muted">
              {t('owner.kpi.revenue')}
            </p>
            <p className="text-xl font-semibold tabular-nums">
              <AnimatedNumber
                value={toNumber(ledger?.totalAmount ?? 0)}
                format={(n) => formatMoney(n)}
              />
            </p>
          </div>
        </Card>
      </div>

      <DataTable
        columns={columns}
        data={rows}
        rowKey={(a) => a.id}
        loading={isLoading}
        emptyTitle={t('owner.empty')}
        emptyDescription={t('owner.emptyHint')}
        emptyIcon={<Building2 className="h-6 w-6" aria-hidden />}
      />

      <CreateAcademyModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        submitting={createAcademy.isPending}
        onSubmit={(dto) =>
          createAcademy.mutate(dto, {
            onSuccess: () => {
              toast.success(t('owner.toasts.created'));
              setCreateOpen(false);
            },
            onError: () => toast.error(t('crud.createError')),
          })
        }
      />

      <ExtendModal
        academy={extending}
        onClose={() => setExtending(null)}
        submitting={extendAcademy.isPending}
        onSubmit={(months, amount, note) =>
          extending &&
          extendAcademy.mutate(
            { id: extending.id, dto: { months, amount, note } },
            {
              onSuccess: () => {
                toast.success(t('owner.toasts.extended'));
                setExtending(null);
              },
              onError: () => toast.error(t('crud.updateError')),
            },
          )
        }
      />

      <EditModal
        academy={editing}
        onClose={() => setEditing(null)}
        submitting={updateAcademy.isPending}
        onSubmit={(dto) =>
          editing &&
          updateAcademy.mutate(
            { id: editing.id, dto },
            {
              onSuccess: () => {
                toast.success(t('crud.updated'));
                setEditing(null);
              },
              onError: () => toast.error(t('crud.updateError')),
            },
          )
        }
      />

      <ConfirmDialog
        open={Boolean(blocking)}
        onClose={() => setBlocking(null)}
        title={
          blocking?.status === 'BLOCKED'
            ? t('owner.confirm.unblockTitle')
            : t('owner.confirm.blockTitle')
        }
        description={blocking?.name}
        variant={blocking?.status === 'BLOCKED' ? 'primary' : 'danger'}
        confirmLabel={
          blocking?.status === 'BLOCKED'
            ? t('owner.actions.unblock')
            : t('owner.actions.block')
        }
        confirming={setStatus.isPending}
        onConfirm={() =>
          blocking &&
          setStatus.mutate(
            {
              id: blocking.id,
              status: blocking.status === 'BLOCKED' ? 'ACTIVE' : 'BLOCKED',
            },
            {
              onSuccess: () => {
                toast.success(t('crud.updated'));
                setBlocking(null);
              },
              onError: () => toast.error(t('crud.updateError')),
            },
          )
        }
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title={t('owner.confirm.deleteTitle')}
        description={t('owner.confirm.deleteHint', {
          name: deleting?.name ?? '',
        })}
        confirmLabel={t('crud.delete')}
        confirming={deleteAcademy.isPending}
        onConfirm={() =>
          deleting &&
          deleteAcademy.mutate(deleting.id, {
            onSuccess: () => {
              toast.success(t('crud.deleted'));
              setDeleting(null);
            },
            onError: () => toast.error(t('crud.deleteError')),
          })
        }
      />
    </div>
  );
}

/* ------------------------------ modals ------------------------------ */

function CreateAcademyModal({
  open,
  onClose,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  submitting: boolean;
  onSubmit: (dto: {
    name: string;
    contactName?: string;
    contactPhone?: string;
    founderEmail: string;
    founderPassword: string;
    months: number;
    amount?: number;
    note?: string;
  }) => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [founderEmail, setFounderEmail] = useState('');
  const [founderPassword, setFounderPassword] = useState('');
  const [months, setMonths] = useState('12');
  const [amount, setAmount] = useState('');

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit({
      name: name.trim(),
      contactName: contactName.trim() || undefined,
      contactPhone: contactPhone.trim() || undefined,
      founderEmail: founderEmail.trim(),
      founderPassword,
      months: Math.max(1, Number(months) || 12),
      amount: amount ? Number(amount) : undefined,
    });
  };

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={t('owner.createTitle')}
      onSubmit={handleSubmit}
      submitting={submitting}
      submitDisabled={
        !name.trim() || !founderEmail.trim() || founderPassword.length < 8
      }
    >
      <div className="space-y-3">
        <Input
          label={t('owner.fields.name')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            label={t('owner.fields.contactName')}
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
          />
          <Input
            label={t('owner.fields.contactPhone')}
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
          />
        </div>
        <div className="rounded-lg border border-border bg-surface-muted/40 p-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-foreground-muted">
            {t('owner.founderAccess')}
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label={t('owner.fields.founderEmail')}
              type="email"
              value={founderEmail}
              onChange={(e) => setFounderEmail(e.target.value)}
              required
            />
            <Input
              label={t('owner.fields.founderPassword')}
              type="text"
              value={founderPassword}
              onChange={(e) => setFounderPassword(e.target.value)}
              placeholder={t('owner.fields.passwordHint')}
              required
            />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            label={t('owner.fields.months')}
            type="number"
            min={1}
            max={60}
            value={months}
            onChange={(e) => setMonths(e.target.value)}
            required
          />
          <Input
            label={t('owner.fields.amount')}
            type="number"
            min={0}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
      </div>
    </FormModal>
  );
}

function ExtendModal({
  academy,
  onClose,
  submitting,
  onSubmit,
}: {
  academy: Academy | null;
  onClose: () => void;
  submitting: boolean;
  onSubmit: (months: number, amount?: number, note?: string) => void;
}) {
  const { t } = useTranslation();
  const [months, setMonths] = useState('1');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  return (
    <FormModal
      open={Boolean(academy)}
      onClose={onClose}
      title={t('owner.extendTitle', { name: academy?.name ?? '' })}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(
          Math.max(1, Number(months) || 1),
          amount ? Number(amount) : undefined,
          note.trim() || undefined,
        );
      }}
      submitting={submitting}
    >
      <div className="space-y-3">
        <p className="text-sm text-foreground-muted">
          {t('owner.extendCurrent', {
            date: dateFmt(academy?.subscriptionEnd),
          })}
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            label={t('owner.fields.months')}
            type="number"
            min={1}
            max={60}
            value={months}
            onChange={(e) => setMonths(e.target.value)}
            required
          />
          <Input
            label={t('owner.fields.amount')}
            type="number"
            min={0}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <Textarea
          label={t('owner.fields.note')}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
        />
      </div>
    </FormModal>
  );
}

function EditModal({
  academy,
  onClose,
  submitting,
  onSubmit,
}: {
  academy: Academy | null;
  onClose: () => void;
  submitting: boolean;
  onSubmit: (dto: {
    name?: string;
    contactName?: string;
    contactPhone?: string;
  }) => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  // Sync local fields when a different academy opens (render-safe pattern).
  if (academy && academy.id !== loadedFor) {
    setName(academy.name);
    setContactName(academy.contactName ?? '');
    setContactPhone(academy.contactPhone ?? '');
    setLoadedFor(academy.id);
  }

  return (
    <FormModal
      open={Boolean(academy)}
      onClose={onClose}
      title={t('owner.editTitle')}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          name: name.trim() || undefined,
          contactName: contactName.trim() || undefined,
          contactPhone: contactPhone.trim() || undefined,
        });
      }}
      submitting={submitting}
      submitDisabled={!name.trim()}
    >
      <div className="space-y-3">
        <Input
          label={t('owner.fields.name')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            label={t('owner.fields.contactName')}
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
          />
          <Input
            label={t('owner.fields.contactPhone')}
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
          />
        </div>
      </div>
    </FormModal>
  );
}
