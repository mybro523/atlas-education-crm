import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Boxes, Phone, UserCircle, Users, Wallet } from 'lucide-react';

import { Badge, Card, EmptyState, Spinner } from '@/shared/ui';
import { useMyStudentProfile } from '@/entities/me';
import { useBranches } from '@/entities/branch';
import { formatMoney } from '@/shared/lib';
import { formatDate } from '@/features/view-performance';

/** One label/value row inside a definition-list card. */
function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs uppercase tracking-wide text-foreground-muted">
        {label}
      </dt>
      <dd className="mt-0.5 truncate text-sm text-foreground">{value}</dd>
    </div>
  );
}

/**
 * "My profile" — read-only personal data: full name, contact, branch,
 * enrollment date, group memberships and parents/guardians.
 */
export function MyProfileView() {
  const { t } = useTranslation();
  const { data: profile, isLoading, isError } = useMyStudentProfile();
  const { data: branches } = useBranches();

  const branchName = useMemo(() => {
    if (!profile) return undefined;
    return branches?.find((b) => b.id === profile.branchId)?.name;
  }, [branches, profile]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner />
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <Card flush>
        <EmptyState
          title={t('studentCabinet.loadError')}
          icon={<UserCircle className="h-6 w-6" aria-hidden />}
        />
      </Card>
    );
  }

  const fullName = [profile.lastName, profile.firstName, profile.middleName]
    .filter(Boolean)
    .join(' ');

  // Subscription (абонемент): fall back to the course monthly price when the
  // backend omits dueAmount, and derive the debt when owedAmount is missing.
  const dueAmount = profile.dueAmount ?? profile.course?.pricePerMonth ?? 0;
  const paidAmount = profile.paidAmount ?? 0;
  const owedAmount = profile.owedAmount ?? Math.max(0, dueAmount - paidAmount);

  return (
    <div className="space-y-4">
      {/* Identity header */}
      <Card className="flex items-center gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700 dark:bg-brand-600/20 dark:text-brand-300">
          <UserCircle className="h-8 w-8" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold text-foreground">
            {fullName}
          </h2>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Badge variant={profile.isActive ? 'success' : 'muted'} dot>
              {profile.isActive
                ? t('studentCabinet.profile.active')
                : t('studentCabinet.profile.inactive')}
            </Badge>
            {profile.phone && (
              <span className="flex items-center gap-1 text-xs text-foreground-muted">
                <Phone className="h-3.5 w-3.5" aria-hidden />
                {profile.phone}
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* Subscription (абонемент): paid / due for the current period + debt */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-primary" aria-hidden />
            <h3 className="text-sm font-semibold text-foreground">
              {t('students.subscription')}
            </h3>
          </div>
          {profile.course && (
            <span className="truncate text-xs text-foreground-muted">
              {profile.course.name}
            </span>
          )}
        </div>
        <p className="mt-3 text-lg font-semibold text-foreground">
          {formatMoney(paidAmount)}
          <span className="font-normal text-foreground-muted">
            {' / '}
            {formatMoney(dueAmount)}
          </span>
        </p>
        {owedAmount > 0 ? (
          <p className="mt-1 text-sm font-medium text-danger">
            {t('students.owedShort')}: {formatMoney(owedAmount)}
          </p>
        ) : (
          <p className="mt-1 text-sm font-medium text-success">
            {t('students.owedShort')}: 0
          </p>
        )}
      </Card>

      {/* Personal details */}
      <Card>
        <h3 className="mb-3 text-sm font-semibold text-foreground">
          {t('studentCabinet.profile.personalData')}
        </h3>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <InfoRow
            label={t('studentCabinet.profile.firstName')}
            value={profile.firstName || '—'}
          />
          <InfoRow
            label={t('studentCabinet.profile.lastName')}
            value={profile.lastName || '—'}
          />
          <InfoRow
            label={t('studentCabinet.profile.middleName')}
            value={profile.middleName || '—'}
          />
          <InfoRow
            label={t('studentCabinet.profile.birthDate')}
            value={profile.birthDate ? formatDate(profile.birthDate) : '—'}
          />
          <InfoRow
            label={t('studentCabinet.profile.phone')}
            value={profile.phone || '—'}
          />
          <InfoRow
            label={t('studentCabinet.profile.branch')}
            value={branchName ?? '—'}
          />
          <InfoRow
            label={t('studentCabinet.profile.enrollmentDate')}
            value={formatDate(profile.enrollmentDate)}
          />
        </dl>
      </Card>

      {/* Groups */}
      <Card>
        <div className="mb-3 flex items-center gap-2">
          <Boxes className="h-4 w-4 text-primary" aria-hidden />
          <h3 className="text-sm font-semibold text-foreground">
            {t('studentCabinet.profile.groups')}
          </h3>
        </div>
        {profile.groups.length === 0 ? (
          <p className="text-sm text-foreground-muted">
            {t('studentCabinet.profile.noGroups')}
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {profile.groups.map((group) => (
              <li key={group.id}>
                <Badge variant="primary">{group.name}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Parents / guardians */}
      <Card>
        <div className="mb-3 flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" aria-hidden />
          <h3 className="text-sm font-semibold text-foreground">
            {t('studentCabinet.profile.parents')}
          </h3>
        </div>
        {profile.parents.length === 0 ? (
          <p className="text-sm text-foreground-muted">
            {t('studentCabinet.profile.noParents')}
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {profile.parents.map((parent) => (
              <li
                key={parent.id}
                className="rounded-xl border border-border bg-background p-3"
              >
                <p className="truncate text-sm font-medium text-foreground">
                  {parent.lastName} {parent.firstName}
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-foreground-muted">
                  <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  {parent.phone}
                </p>
                {parent.workplace && (
                  <p className="mt-0.5 truncate text-xs text-foreground-muted">
                    {parent.workplace}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
