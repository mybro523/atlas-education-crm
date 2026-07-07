import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Badge } from '@/shared/ui';
import { formatDate, formatMoney, isOptimisticId } from '@/shared/lib';
import { useBranches } from '@/entities/branch';
import { useTeacher, type Teacher } from '@/entities/teacher';

export interface TeacherDetailModalProps {
  open: boolean;
  onClose: () => void;
  /** Teacher whose full profile is shown; when null the modal renders nothing. */
  teacher: Teacher | null;
}

const DASH = '—';

/** Education levels stored as stable codes; anything else is a legacy value. */
const EDUCATION_LEVELS = ['NONE', 'SECONDARY', 'HIGHER'] as const;

/** True when a value is worth rendering (non-null, non-empty string). */
function hasValue(value: ReactNode): boolean {
  return value !== null && value !== undefined && value !== '';
}

/** One label / value line. Stacks on mobile, two columns from `sm`. */
function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-0.5 py-2 sm:grid-cols-[10rem_1fr] sm:gap-3">
      <dt className="text-xs font-medium uppercase tracking-wide text-foreground-muted">
        {label}
      </dt>
      <dd className="min-w-0 break-words text-sm text-foreground">
        {hasValue(value) ? value : DASH}
      </dd>
    </div>
  );
}

/**
 * Read-only teacher card. Opened by clicking a row in the teachers table and
 * shows the full profile: identity, branch, specialty, education, Telegram,
 * dates and hourly rate, plus the groups the teacher leads and the cabinet
 * login status. Groups are a detail-only include, so the modal fetches the
 * full record for the opened teacher and uses the clicked row as the instant
 * fallback while it loads. Nothing here mutates — editing stays in the form.
 */
export function TeacherDetailModal({
  open,
  onClose,
  teacher,
}: TeacherDetailModalProps) {
  const { t } = useTranslation();
  const { data: branches } = useBranches();

  // The list payload may not embed `groups` — pull the detail record for real
  // (non-optimistic) ids while the modal is open.
  const detailId =
    open && teacher && !isOptimisticId(teacher.id) ? teacher.id : undefined;
  const { data: detail } = useTeacher(detailId);

  if (!teacher) return null;

  // Prefer the freshest detail data, falling back to the clicked list row.
  const info: Teacher =
    detail && detail.id === teacher.id ? { ...teacher, ...detail } : teacher;

  const fullName =
    [info.lastName, info.firstName, info.middleName].filter(Boolean).join(' ') ||
    DASH;

  // Resolve the branch by the current id first (fresh after an optimistic
  // branch change), then via the embedded ref from the payload.
  const branchName =
    branches?.find((b) => b.id === info.branchId)?.name ??
    info.branch?.name ??
    DASH;

  const educationLabel = info.educationLevel
    ? EDUCATION_LEVELS.includes(
        info.educationLevel as (typeof EDUCATION_LEVELS)[number],
      )
      ? t(`teachers.education.${info.educationLevel}`)
      : info.educationLevel
    : '';

  const groups = info.groups ?? [];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('teachers.detailTitle')}
      closeLabel={t('common.close')}
      className="max-w-2xl"
    >
      <div className="space-y-5">
        {/* Core profile */}
        <section>
          <dl className="divide-y divide-border/60">
            <DetailRow
              label={`${t('fields.lastName')} / ${t('fields.firstName')}`}
              value={fullName}
            />
            <DetailRow label={t('fields.phone')} value={info.phone} />
            <DetailRow label={t('fields.branch')} value={branchName} />
            <DetailRow label={t('fields.specialty')} value={info.specialty} />
            <DetailRow
              label={t('fields.educationLevel')}
              value={educationLabel}
            />
            <DetailRow
              label={t('fields.telegram')}
              value={info.telegramUsername}
            />
            <DetailRow
              label={t('fields.birthDate')}
              value={info.birthDate ? formatDate(info.birthDate) : ''}
            />
            <DetailRow
              label={t('fields.hireDate')}
              value={info.hireDate ? formatDate(info.hireDate) : ''}
            />
            <DetailRow
              label={t('fields.hourlyRate')}
              value={info.hourlyRate != null ? formatMoney(info.hourlyRate) : ''}
            />
          </dl>
        </section>

        {/* Groups the teacher leads (each group carries its course) */}
        <section className="space-y-3 border-t border-border pt-4">
          <h3 className="text-sm font-semibold text-foreground">
            {t('teachers.groupsTitle')}
          </h3>
          {groups.length > 0 ? (
            <ul className="space-y-2">
              {groups.map((group) => (
                <li
                  key={group.id}
                  className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 rounded-lg border border-border bg-surface px-3 py-2"
                >
                  <span className="text-sm font-medium text-foreground">
                    {group.name}
                  </span>
                  {group.course?.name && (
                    <span className="text-xs text-foreground-muted">
                      {group.course.name}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-foreground-muted">
              {t('teachers.noGroups')}
            </p>
          )}
        </section>

        {/* Cabinet access (login) status */}
        <section className="space-y-3 border-t border-border pt-4">
          <h3 className="text-sm font-semibold text-foreground">
            {t('teachers.cabinetAccess')}
          </h3>
          {info.user ? (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2">
              <span className="break-all text-sm text-foreground">
                {info.user.email ?? DASH}
              </span>
              <Badge variant={info.user.isActive ? 'success' : 'muted'} dot>
                {info.user.isActive
                  ? t('employees.active')
                  : t('employees.blockedBadge')}
              </Badge>
            </div>
          ) : (
            <p className="text-sm text-foreground-muted">
              {t('teachers.noCabinet')}
            </p>
          )}
        </section>
      </div>
    </Modal>
  );
}
