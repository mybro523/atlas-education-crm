import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { FormModal, Input, Select, useToast } from '@/shared/ui';
import { extractErrorMessage } from '@/shared/api';
import { useGroups } from '@/entities/group';
import {
  useCreateLessonRate,
  useUpdateLessonRate,
  type LessonRate,
} from '@/entities/lesson-rate';

export interface LessonRateFormModalProps {
  open: boolean;
  onClose: () => void;
  /** When provided, edits this rate; otherwise creates one. */
  rate?: LessonRate | null;
}

/**
 * Create/edit a lesson pay-rate (API_CONTRACT §14.2). A rate can be global
 * (no group) or scoped to a specific group. Optimistic + localized; TJS amount.
 */
export function LessonRateFormModal({
  open,
  onClose,
  rate,
}: LessonRateFormModalProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const isEdit = Boolean(rate);

  const createRate = useCreateLessonRate();
  const updateRate = useUpdateLessonRate();
  const { data: groupsData } = useGroups({ pageSize: 100 });

  const NAME_MAX = 100;

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [groupId, setGroupId] = useState('');
  const [amountError, setAmountError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(rate?.name ?? '');
    setAmount(rate ? String(rate.amount) : '');
    setGroupId(rate?.groupId ?? '');
    setAmountError(null);
  }, [open, rate]);

  const groupOptions = useMemo(
    () => [
      { value: '', label: t('finance.rates.global') },
      ...(groupsData?.items ?? []).map((g) => ({
        value: g.id,
        label: g.name,
      })),
    ],
    [groupsData, t],
  );

  // HARD validation (amount > 0) blocks submit; on valid we INSTANT-CLOSE and
  // toast on error while the optimistic row rolls back.
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = amount.trim();
    const numeric = Number(trimmed);
    if (!trimmed) {
      setAmountError(t('form.required'));
      return;
    }
    if (!Number.isFinite(numeric) || numeric <= 0) {
      setAmountError(t('finance.records.amountMin'));
      return;
    }
    setAmountError(null);

    const dto = {
      name: name.trim() || undefined,
      amount: numeric,
      groupId: groupId || undefined,
    };

    const onError = (err: unknown) =>
      toast.error(extractErrorMessage(err) ?? t('form.saveError'));

    if (isEdit && rate) {
      updateRate.mutate(
        { id: rate.id, dto },
        {
          onSuccess: () => toast.success(t('finance.rates.updated')),
          onError,
        },
      );
    } else {
      createRate.mutate(dto, {
        onSuccess: () => toast.success(t('finance.rates.created')),
        onError,
      });
    }

    onClose();
  };

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={isEdit ? t('finance.rates.editTitle') : t('finance.rates.createTitle')}
      onSubmit={handleSubmit}
    >
      <Input
        label={`${t('finance.rates.name')} (${t('form.optional')})`}
        placeholder={t('finance.rates.namePlaceholder')}
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={NAME_MAX}
        autoFocus
      />
      <Input
        label={`${t('finance.rates.amount')} (TJS)`}
        type="number"
        inputMode="decimal"
        min={0}
        step="0.01"
        value={amount}
        onChange={(e) => {
          setAmount(e.target.value);
          if (amountError) setAmountError(null);
        }}
        error={amountError ?? undefined}
      />
      <Select
        label={t('finance.rates.group')}
        options={groupOptions}
        value={groupId}
        onChange={(e) => setGroupId(e.target.value)}
      />
    </FormModal>
  );
}
