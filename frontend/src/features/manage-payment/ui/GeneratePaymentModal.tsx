import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { FormModal, Select, Input, useToast } from '@/shared/ui';
import { extractErrorMessage } from '@/shared/api';
import { useDebouncedValue } from '@/shared/lib/hooks';
import { useStudents } from '@/entities/student';
import { useGroups } from '@/entities/group';
import { useGeneratePayments } from '@/entities/payment';

export interface GeneratePaymentModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Generate current-period tuition payments (API_CONTRACT §12). Leaving the
 * student blank runs generation for all active students; an optional group and
 * reference date narrow the run. The server upserts on
 * (studentId, groupId, billingMonthStart), so re-running is idempotent.
 */
export function GeneratePaymentModal({
  open,
  onClose,
}: GeneratePaymentModalProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const generate = useGeneratePayments();

  const [studentId, setStudentId] = useState('');
  const [groupId, setGroupId] = useState('');
  const [ref, setRef] = useState('');
  const [studentSearchInput, setStudentSearchInput] = useState('');
  const studentSearch = useDebouncedValue(studentSearchInput.trim(), 350);

  useEffect(() => {
    if (!open) return;
    setStudentId('');
    setGroupId('');
    setRef('');
    setStudentSearchInput('');
  }, [open]);

  const { data: studentsData } = useStudents({
    pageSize: 50,
    search: studentSearch || undefined,
  });
  const { data: groupsData } = useGroups({ pageSize: 100 });

  const studentOptions = useMemo(
    () => [
      { value: '', label: t('finance.payments.allActiveStudents') },
      ...(studentsData?.items ?? []).map((s) => ({
        value: s.id,
        label: `${s.lastName} ${s.firstName}`,
      })),
    ],
    [studentsData, t],
  );

  const groupOptions = useMemo(
    () => [
      { value: '', label: t('finance.payments.allGroups') },
      ...(groupsData?.items ?? []).map((g) => ({
        value: g.id,
        label: g.name,
      })),
    ],
    [groupsData, t],
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    generate.mutate(
      {
        studentId: studentId || undefined,
        groupId: groupId || undefined,
        ref: ref || undefined,
      },
      {
        onSuccess: (payments) => {
          toast.success(
            t('finance.payments.generatedCount', {
              count: payments?.length ?? 0,
            }),
          );
          onClose();
        },
        onError: (err) =>
          toast.error(extractErrorMessage(err) ?? t('form.saveError')),
      },
    );
  };

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={t('finance.payments.generateTitle')}
      onSubmit={handleSubmit}
      submitting={generate.isPending}
      submitLabel={t('finance.payments.generate')}
    >
      <p className="text-sm text-foreground-muted">
        {t('finance.payments.generateHint')}
      </p>

      <Input
        label={`${t('finance.payments.searchStudent')} (${t('form.optional')})`}
        placeholder={t('finance.payments.searchStudentPlaceholder')}
        value={studentSearchInput}
        onChange={(e) => setStudentSearchInput(e.target.value)}
      />

      <Select
        label={t('finance.payments.student')}
        options={studentOptions}
        value={studentId}
        onChange={(e) => setStudentId(e.target.value)}
      />

      <Select
        label={`${t('finance.payments.group')} (${t('form.optional')})`}
        options={groupOptions}
        value={groupId}
        onChange={(e) => setGroupId(e.target.value)}
      />

      <Input
        label={`${t('finance.payments.referenceDate')} (${t('form.optional')})`}
        type="date"
        value={ref}
        onChange={(e) => setRef(e.target.value)}
      />
    </FormModal>
  );
}
