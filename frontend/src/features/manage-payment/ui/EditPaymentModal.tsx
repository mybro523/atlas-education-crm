import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { FormModal, Input, Select, useToast } from '@/shared/ui';
import { extractErrorMessage } from '@/shared/api';
import { isValidAmount } from '@/shared/lib';
import {
  useUpdatePayment,
  type Payment,
  type PaymentStatus,
} from '@/entities/payment';

export interface EditPaymentModalProps {
  open: boolean;
  onClose: () => void;
  payment: Payment | null;
}

/** Edit a payment's amount and status (API_CONTRACT §12, optimistic). */
export function EditPaymentModal({
  open,
  onClose,
  payment,
}: EditPaymentModalProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const updatePayment = useUpdatePayment();

  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState<PaymentStatus>('UNPAID');
  const [amountError, setAmountError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !payment) return;
    setAmount(String(payment.amount ?? ''));
    setStatus(payment.status);
    setAmountError(null);
  }, [open, payment]);

  const statusOptions = [
    { value: 'UNPAID', label: t('finance.payments.status.UNPAID') },
    { value: 'PAID', label: t('finance.payments.status.PAID') },
  ];

  // HARD validation (amount > 0) blocks submit; on valid we INSTANT-CLOSE and
  // let the optimistic update stand, toasting + rolling back only on error.
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!payment) return;
    const trimmed = amount.trim();
    const numeric = Number(trimmed);
    if (!trimmed) {
      setAmountError(t('form.required'));
      return;
    }
    if (!isValidAmount(trimmed, { min: 0.01 })) {
      setAmountError(t('finance.records.amountMin'));
      return;
    }
    setAmountError(null);
    updatePayment.mutate(
      { id: payment.id, dto: { amount: numeric, status } },
      {
        onSuccess: () => toast.success(t('finance.payments.updated')),
        onError: (err) =>
          toast.error(extractErrorMessage(err) ?? t('form.saveError')),
      },
    );
    onClose();
  };

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={t('finance.payments.editTitle')}
      onSubmit={handleSubmit}
    >
      <Input
        label={`${t('finance.records.amount')} (TJS)`}
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
        autoFocus
      />
      <Select
        label={t('fields.status')}
        options={statusOptions}
        value={status}
        onChange={(e) => setStatus(e.target.value as PaymentStatus)}
      />
    </FormModal>
  );
}
