import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { FormModal, Input, useToast } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { isValidAmount, parseAmount } from '@/shared/lib';
import { extractErrorMessage } from '@/shared/api';
import { useRecordPayment, type PaymentMethod } from '@/entities/student-payment';
import type { Student } from '@/entities/student';

export interface RecordPaymentModalProps {
  open: boolean;
  onClose: () => void;
  student: Student | null;
}

const MAX_AMOUNT = 99999999.99;

/** Derive the amount to prefill: owed → due-paid → courseFee → empty. */
function defaultAmount(student: Student | null): string {
  if (!student) return '';
  if (student.owedAmount != null && student.owedAmount > 0) {
    return String(student.owedAmount);
  }
  if (student.dueAmount != null) {
    const owed = Math.max(0, student.dueAmount - (student.paidAmount ?? 0));
    if (owed > 0) return String(owed);
  }
  if (student.courseFee != null && student.courseFee > 0) {
    return String(student.courseFee);
  }
  return '';
}

/**
 * Record a student subscription (абонемент) payment. Amount defaults to what the
 * student owes; method is CASH or CARD. INSTANT-CLOSE optimistic submit.
 */
export function RecordPaymentModal({
  open,
  onClose,
  student,
}: RecordPaymentModalProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const recordPayment = useRecordPayment();

  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [amountError, setAmountError] = useState<string | null>(null);
  const [methodError, setMethodError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setAmount(defaultAmount(student));
    setMethod(null);
    setAmountError(null);
    setMethodError(null);
  }, [open, student]);

  const methodOptions: { value: PaymentMethod; label: string }[] = [
    { value: 'CASH', label: t('payments.method.CASH') },
    { value: 'CARD', label: t('payments.method.CARD') },
  ];

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!student) return;

    const trimmed = amount.trim();
    const numeric = parseAmount(trimmed);
    let invalid = false;

    if (numeric != null && numeric > MAX_AMOUNT) {
      setAmountError(t('payments.amountMax'));
      invalid = true;
    } else if (!isValidAmount(trimmed, { min: 0.01 })) {
      setAmountError(t('payments.amountMin'));
      invalid = true;
    } else {
      setAmountError(null);
    }

    if (!method) {
      setMethodError(t('payments.methodRequired'));
      invalid = true;
    } else {
      setMethodError(null);
    }

    if (invalid || numeric == null || !method) return;

    recordPayment.mutate(
      { studentId: student.id, amount: numeric, method },
      {
        onSuccess: () => toast.success(t('payments.recorded')),
        onError: (err) =>
          toast.error(extractErrorMessage(err) ?? t('form.saveError')),
      },
    );
    onClose();
  };

  const studentName = student
    ? [student.lastName, student.firstName].filter(Boolean).join(' ')
    : '';

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={t('payments.recordTitle')}
      submitLabel={t('payments.submit')}
      onSubmit={handleSubmit}
    >
      {studentName && (
        <p className="text-sm text-foreground-muted">
          {t('payments.forStudent', { name: studentName })}
        </p>
      )}

      <Input
        label={`${t('payments.amount')} (TJS)`}
        type="number"
        inputMode="decimal"
        min={0}
        max={MAX_AMOUNT}
        step="0.01"
        value={amount}
        onChange={(e) => {
          setAmount(e.target.value);
          if (amountError) setAmountError(null);
        }}
        error={amountError ?? undefined}
        autoFocus
      />

      <div>
        <span className="mb-1.5 block text-sm font-medium text-foreground">
          {t('payments.methodLabel')}
        </span>
        <div className="grid grid-cols-2 gap-2">
          {methodOptions.map((opt) => {
            const active = method === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setMethod(opt.value);
                  if (methodError) setMethodError(null);
                }}
                className={cn(
                  'h-10 rounded-lg border text-sm font-medium transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2',
                  'focus-visible:ring-ring focus-visible:ring-offset-2',
                  'focus-visible:ring-offset-background',
                  active
                    ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                    : 'border-border bg-transparent text-foreground hover:bg-surface-muted',
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        {methodError && (
          <p role="alert" className="mt-1.5 text-sm text-danger">
            {methodError}
          </p>
        )}
      </div>
    </FormModal>
  );
}
