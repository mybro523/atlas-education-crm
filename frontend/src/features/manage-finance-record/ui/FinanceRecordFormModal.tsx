import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';

import { FormModal, Input, Select, Textarea, useToast } from '@/shared/ui';
import { extractErrorMessage } from '@/shared/api';
import { useBranches } from '@/entities/branch';
import {
  useCreateFinanceRecord,
  useUpdateFinanceRecord,
  type FinanceRecord,
} from '@/entities/finance-record';
import { toDateInput } from '@/shared/lib';

const CATEGORY_MAX = 100;
const DESCRIPTION_MAX = 500;

const schema = z.object({
  branchId: z.string().min(1, { message: 'required' }),
  type: z.enum(['INCOME', 'EXPENSE']),
  amount: z.coerce
    .number({ invalid_type_error: 'required' })
    .positive({ message: 'min' }),
  category: z.string().max(CATEGORY_MAX).optional(),
  description: z.string().max(DESCRIPTION_MAX).optional(),
  occurredAt: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export interface FinanceRecordFormModalProps {
  open: boolean;
  onClose: () => void;
  /** When provided, edits this record; otherwise creates one. */
  record?: FinanceRecord | null;
  /** Preselect a type when creating (e.g. from an "Add expense" button). */
  defaultType?: 'INCOME' | 'EXPENSE';
}

/**
 * Create/edit a manual income or expense record (API_CONTRACT §13). Optimistic
 * via the finance-record entity hooks; localized; TJS amounts.
 */
export function FinanceRecordFormModal({
  open,
  onClose,
  record,
  defaultType = 'INCOME',
}: FinanceRecordFormModalProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const isEdit = Boolean(record);

  const { data: branches } = useBranches();
  const createRecord = useCreateFinanceRecord();
  const updateRecord = useUpdateFinanceRecord();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      branchId: '',
      type: defaultType,
      amount: 0,
      category: '',
      description: '',
      occurredAt: '',
    },
  });

  useEffect(() => {
    if (!open) return;
    reset({
      branchId: record?.branchId ?? '',
      type: record?.type ?? defaultType,
      amount: record?.amount ?? 0,
      category: record?.category ?? '',
      description: record?.description ?? '',
      occurredAt: toDateInput(record?.occurredAt),
    });
  }, [open, record, defaultType, reset]);

  const branchOptions = useMemo(
    () => (branches ?? []).map((b) => ({ value: b.id, label: b.name })),
    [branches],
  );

  const typeOptions = [
    { value: 'INCOME', label: t('finance.records.income') },
    { value: 'EXPENSE', label: t('finance.records.expense') },
  ];

  // INSTANT-CLOSE: fire optimistically and close immediately; a failed write
  // surfaces as a toast while the entity hook rolls the optimistic row back.
  const onValid = (values: FormValues) => {
    const dto = {
      branchId: values.branchId,
      type: values.type,
      amount: values.amount,
      category: values.category?.trim() || undefined,
      description: values.description?.trim() || undefined,
      occurredAt: values.occurredAt || undefined,
    };

    const onError = (err: unknown) =>
      toast.error(extractErrorMessage(err) ?? t('form.saveError'));

    if (isEdit && record) {
      updateRecord.mutate(
        { id: record.id, dto },
        {
          onSuccess: () => toast.success(t('finance.records.updated')),
          onError,
        },
      );
    } else {
      createRecord.mutate(dto, {
        onSuccess: () => toast.success(t('finance.records.created')),
        onError,
      });
    }

    onClose();
  };

  const amountError = errors.amount
    ? errors.amount.message === 'min'
      ? t('finance.records.amountMin')
      : t('form.requiredField')
    : undefined;

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={
        isEdit
          ? t('finance.records.editTitle')
          : t('finance.records.createTitle')
      }
      onSubmit={handleSubmit(onValid)}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select
          label={t('finance.records.type')}
          options={typeOptions}
          error={errors.type ? t('form.requiredField') : undefined}
          {...register('type')}
        />
        <Input
          label={`${t('finance.records.amount')} (TJS)`}
          type="number"
          inputMode="decimal"
          min={0}
          step="0.01"
          error={amountError}
          {...register('amount')}
        />
        <Select
          label={t('fields.branch')}
          placeholder={t('crud.allBranches')}
          options={branchOptions}
          error={errors.branchId ? t('form.requiredField') : undefined}
          {...register('branchId')}
        />
        <Input
          label={t('finance.records.occurredAt')}
          type="date"
          {...register('occurredAt')}
        />
      </div>

      <Input
        label={`${t('finance.records.category')} (${t('form.optional')})`}
        placeholder={t('finance.records.categoryPlaceholder')}
        maxLength={CATEGORY_MAX}
        {...register('category')}
      />

      <Textarea
        label={`${t('finance.records.description')} (${t('form.optional')})`}
        rows={3}
        maxLength={DESCRIPTION_MAX}
        {...register('description')}
      />
    </FormModal>
  );
}
