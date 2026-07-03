import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Input, Button } from '@/shared/ui';
import type { CreateParentDto } from '@/entities/student';

export interface ParentRowFormProps {
  /** Initial values when editing an existing parent. */
  initial?: CreateParentDto;
  submitting?: boolean;
  onSubmit: (dto: CreateParentDto) => void;
  onCancel: () => void;
}

/**
 * Inline add/edit form for a single parent. Rendered inside the student
 * <form>, so it uses plain buttons (no nested <form>) to avoid submitting the
 * outer student form. The caller decides whether to persist immediately (edit
 * mode) or stage a draft (create mode).
 */
export function ParentRowForm({
  initial,
  submitting = false,
  onSubmit,
  onCancel,
}: ParentRowFormProps) {
  const { t } = useTranslation();
  const [firstName, setFirstName] = useState(initial?.firstName ?? '');
  const [lastName, setLastName] = useState(initial?.lastName ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [workplace, setWorkplace] = useState(initial?.workplace ?? '');
  const [errors, setErrors] = useState<{
    firstName?: string;
    lastName?: string;
    phone?: string;
  }>({});

  const submit = () => {
    const next: typeof errors = {};
    if (!firstName.trim()) next.firstName = t('form.requiredField');
    if (!lastName.trim()) next.lastName = t('form.requiredField');
    if (!phone.trim()) next.phone = t('form.requiredField');
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    onSubmit({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
      workplace: workplace.trim() || undefined,
    });
  };

  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface-muted/40 p-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input
          label={t('fields.firstName')}
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          error={errors.firstName}
          disabled={submitting}
        />
        <Input
          label={t('fields.lastName')}
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          error={errors.lastName}
          disabled={submitting}
        />
        <Input
          label={t('fields.phone')}
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          error={errors.phone}
          disabled={submitting}
        />
        <Input
          label={`${t('fields.workplace')} (${t('form.optional')})`}
          value={workplace}
          onChange={(e) => setWorkplace(e.target.value)}
          disabled={submitting}
        />
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onCancel}
          disabled={submitting}
        >
          {t('common.cancel')}
        </Button>
        <Button type="button" size="sm" loading={submitting} onClick={submit}>
          {t('common.save')}
        </Button>
      </div>
    </div>
  );
}
