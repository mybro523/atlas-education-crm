import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Calculator } from 'lucide-react';

import { Modal, Button, Select, Input, Spinner, useToast } from '@/shared/ui';
import { extractErrorMessage } from '@/shared/api';
import { useTeachers } from '@/entities/teacher';
import {
  useComputeSalary,
  useCreateSalary,
  type SalaryComputation,
} from '@/entities/salary';
import { formatMoney, formatDate } from '@/shared/lib';

export interface ComputeSalaryModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Compute a teacher's per-lesson salary for a period (API_CONTRACT §0.6, §14.1):
 * sum of payRate over conducted lessons in [from, to]. Shows a preview
 * (lessons count + total + per-lesson breakdown); "Save" persists a PENDING
 * Salary row optimistically.
 */
export function ComputeSalaryModal({ open, onClose }: ComputeSalaryModalProps) {
  const { t } = useTranslation();
  const toast = useToast();

  const compute = useComputeSalary();
  const createSalary = useCreateSalary();

  const [teacherId, setTeacherId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [result, setResult] = useState<SalaryComputation | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: teachersData } = useTeachers({ pageSize: 100 });

  useEffect(() => {
    if (!open) return;
    setTeacherId('');
    setFrom('');
    setTo('');
    setResult(null);
    setError(null);
  }, [open]);

  // Any input change invalidates a stale preview.
  useEffect(() => {
    setResult(null);
  }, [teacherId, from, to]);

  const teacherOptions = useMemo(
    () => [
      { value: '', label: t('finance.salaries.selectTeacher') },
      ...(teachersData?.items ?? []).map((te) => ({
        value: te.id,
        label: `${te.lastName} ${te.firstName}`,
      })),
    ],
    [teachersData, t],
  );

  const canCompute = Boolean(teacherId && from && to);

  const handleCompute = () => {
    setError(null);
    if (!canCompute) {
      setError(t('finance.salaries.fillPeriod'));
      return;
    }
    // Period must be a valid range: end on or after start (single-day allowed).
    if (to < from) {
      setError(t('schedule.fields.endAfterStart'));
      return;
    }
    compute.mutate(
      { teacherId, from, to },
      {
        onSuccess: (data) => setResult(data),
        onError: (err) =>
          setError(extractErrorMessage(err) ?? t('form.loadError')),
      },
    );
  };

  // INSTANT-CLOSE: persist the previewed salary optimistically and close now;
  // a failed write toasts while the optimistic PENDING row rolls back.
  const handlePersist = () => {
    if (!result) return;
    createSalary.mutate(
      {
        teacherId,
        basis: 'PER_LESSON',
        periodStart: result.periodStart,
        periodEnd: result.periodEnd,
        amount: result.amount,
        status: 'PENDING',
      },
      {
        onSuccess: () => toast.success(t('finance.salaries.saved')),
        onError: (err) =>
          toast.error(extractErrorMessage(err) ?? t('form.saveError')),
      },
    );
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('finance.salaries.computeTitle')}
      closeLabel={t('common.close')}
      className="max-w-lg"
    >
      <div className="space-y-4">
        <Select
          label={t('finance.salaries.teacher')}
          options={teacherOptions}
          value={teacherId}
          onChange={(e) => setTeacherId(e.target.value)}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label={t('finance.salaries.periodStart')}
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
          <Input
            label={t('finance.salaries.periodEnd')}
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger"
          >
            {error}
          </div>
        )}

        <Button
          type="button"
          variant="outline"
          onClick={handleCompute}
          disabled={!canCompute}
          loading={compute.isPending}
          fullWidth
        >
          <Calculator className="h-4 w-4" />
          {t('finance.salaries.compute')}
        </Button>

        {/* Preview */}
        {compute.isPending ? (
          <div className="flex justify-center py-6">
            <Spinner />
          </div>
        ) : result ? (
          <div className="space-y-3 rounded-xl border border-border bg-surface-muted/40 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-foreground-muted">
                  {t('finance.salaries.total')}
                </p>
                <p className="text-xl font-semibold text-foreground tabular-nums">
                  {formatMoney(result.amount)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-wide text-foreground-muted">
                  {t('finance.salaries.lessonsCount')}
                </p>
                <p className="text-xl font-semibold text-foreground tabular-nums">
                  {result.lessonsCount}
                </p>
              </div>
            </div>

            {result.lessons.length > 0 && (
              <div className="max-h-40 overflow-y-auto rounded-lg border border-border bg-surface">
                <ul className="divide-y divide-border text-sm">
                  {result.lessons.map((l) => (
                    <li
                      key={l.lessonId}
                      className="flex items-center justify-between gap-3 px-3 py-2"
                    >
                      <span className="text-foreground-muted">
                        {formatDate(l.startsAt)}
                      </span>
                      <span className="font-medium tabular-nums text-foreground">
                        {formatMoney(l.payRate)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : null}

        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="button" onClick={handlePersist} disabled={!result}>
            {t('finance.salaries.save')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
