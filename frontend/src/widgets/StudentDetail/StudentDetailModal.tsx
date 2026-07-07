import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Badge } from '@/shared/ui';
import { formatDate, formatMoney } from '@/shared/lib/format';
import { useBranches } from '@/entities/branch';
import { useCourses } from '@/entities/course';
import type { Parent, Student } from '@/entities/student';
import { levelLabelKey, referralLabelKey } from '@/entities/student';

export interface StudentDetailModalProps {
  open: boolean;
  onClose: () => void;
  /** Student whose full profile is shown; when null the modal renders nothing. */
  student: Student | null;
}

const DASH = '—';

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

/** Read-only father / mother block. Shows a muted note when the slot is empty. */
function ParentCard({
  title,
  parent,
}: {
  title: string;
  parent?: Parent | null;
}) {
  const { t } = useTranslation();
  const name = parent
    ? [parent.lastName, parent.firstName].filter(Boolean).join(' ')
    : '';

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="mb-1 text-sm font-semibold text-foreground">{title}</p>
      {parent ? (
        <dl className="divide-y divide-border/60">
          <DetailRow
            label={`${t('fields.lastName')} / ${t('fields.firstName')}`}
            value={name}
          />
          <DetailRow label={t('fields.phone')} value={parent.phone} />
          <DetailRow label={t('fields.workplace')} value={parent.workplace} />
          <DetailRow label={t('fields.position')} value={parent.position} />
        </dl>
      ) : (
        <p className="text-sm text-foreground-muted">
          {t('students.parents.notAdded')}
        </p>
      )}
    </div>
  );
}

/**
 * Read-only student card. Opened by clicking a row in the students table and
 * shows every field the profile carries: identity, branch, course, level,
 * referral source, course fee, free-form note, cabinet login and both parent
 * slots (father / mother). All data
 * comes from the list payload (which already includes parents / branch / course),
 * with a name fallback via the cached branch / course lists for freshly-created
 * optimistic rows. Nothing here mutates — editing stays in the form modal.
 */
export function StudentDetailModal({
  open,
  onClose,
  student,
}: StudentDetailModalProps) {
  const { t } = useTranslation();
  const { data: branches } = useBranches();
  const { data: coursesData } = useCourses({ pageSize: 100 });

  if (!student) return null;

  const fullName =
    [student.lastName, student.firstName, student.middleName]
      .filter(Boolean)
      .join(' ') || DASH;

  // Resolve names by the current id first (so an optimistic edit that changed the
  // branch/course but left a stale embedded ref still renders correctly), then
  // fall back to the embedded ref from the list payload.
  const branchName =
    branches?.find((b) => b.id === student.branchId)?.name ??
    student.branch?.name ??
    DASH;

  const courseName = student.courseId
    ? (coursesData?.items.find((c) => c.id === student.courseId)?.name ??
      student.course?.name ??
      DASH)
    : DASH;

  const father = student.parents?.find((p) => p.relation === 'FATHER') ?? null;
  const mother = student.parents?.find((p) => p.relation === 'MOTHER') ?? null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={fullName}
      closeLabel={t('common.close')}
      className="max-w-2xl"
    >
      <div className="space-y-5">
        <Badge variant={student.isActive ? 'success' : 'muted'} dot>
          {student.isActive ? t('students.active') : t('students.inactive')}
        </Badge>

        {/* Core profile */}
        <section>
          <h3 className="mb-1 text-sm font-semibold text-foreground">
            {t('students.mainInfo')}
          </h3>
          <dl className="divide-y divide-border/60">
            <DetailRow label={t('fields.phone')} value={student.phone} />
            <DetailRow
              label={t('fields.birthDate')}
              value={student.birthDate ? formatDate(student.birthDate) : ''}
            />
            <DetailRow
              label={t('fields.enrollmentDate')}
              value={formatDate(student.enrollmentDate)}
            />
            <DetailRow label={t('fields.branch')} value={branchName} />
            <DetailRow label={t('fields.course')} value={courseName} />
            <DetailRow
              label={t('fields.level')}
              value={student.level ? t(levelLabelKey(student.level)) : ''}
            />
            <DetailRow
              label={t('fields.referralSource')}
              value={
                student.referralSource
                  ? t(referralLabelKey(student.referralSource))
                  : ''
              }
            />
            <DetailRow
              label={t('fields.courseFee')}
              value={
                student.courseFee != null ? formatMoney(student.courseFee) : ''
              }
            />
            {student.note ? (
              <DetailRow label={t('fields.note')} value={student.note} />
            ) : null}
            <DetailRow
              label={t('fields.login')}
              value={
                student.user?.email ? (
                  student.user.email
                ) : (
                  <span className="text-foreground-muted">
                    {t('teachers.noCabinet')}
                  </span>
                )
              }
            />
          </dl>
        </section>

        {/* Parents */}
        <section className="space-y-3 border-t border-border pt-4">
          <h3 className="text-sm font-semibold text-foreground">
            {t('students.parents.title')}
          </h3>
          <ParentCard title={t('students.parents.father')} parent={father} />
          <ParentCard title={t('students.parents.mother')} parent={mother} />
        </section>
      </div>
    </Modal>
  );
}
