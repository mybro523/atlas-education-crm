import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/shared/ui';
import type { ParentFigureDraft, ParentFigureErrors } from '../model/types';

export interface ParentFigureFieldsProps {
  /** Section heading, e.g. "Отец" / "Мать". */
  legend: string;
  /** Optional leading icon shown next to the legend. */
  icon?: ReactNode;
  value: ParentFigureDraft;
  onChange: (next: ParentFigureDraft) => void;
  errors?: ParentFigureErrors;
  disabled?: boolean;
}

/**
 * One explicit parent block (father or mother) on the student form. Collects
 * ФИО (last + first name), phone, workplace (место работы) and position
 * (должность). The whole block is optional; when the user fills any field the
 * caller enforces name + phone. Fully themed + mobile-first (single column on
 * narrow screens, two columns from `sm`).
 */
export function ParentFigureFields({
  legend,
  icon,
  value,
  onChange,
  errors = {},
  disabled = false,
}: ParentFigureFieldsProps) {
  const { t } = useTranslation();
  const set = (patch: Partial<ParentFigureDraft>) =>
    onChange({ ...value, ...patch });

  return (
    <fieldset className="rounded-xl border border-border bg-surface p-4">
      <legend className="flex items-center gap-1.5 px-1 text-sm font-semibold text-foreground">
        {icon}
        <span>{legend}</span>
        <span className="font-normal text-foreground-muted">
          ({t('form.optional')})
        </span>
      </legend>

      <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input
          label={t('fields.lastName')}
          value={value.lastName}
          onChange={(e) => set({ lastName: e.target.value })}
          error={errors.lastName}
          maxLength={100}
          disabled={disabled}
        />
        <Input
          label={t('fields.firstName')}
          value={value.firstName}
          onChange={(e) => set({ firstName: e.target.value })}
          error={errors.firstName}
          maxLength={100}
          disabled={disabled}
        />
        <Input
          label={t('fields.phone')}
          type="tel"
          inputMode="tel"
          value={value.phone}
          onChange={(e) => set({ phone: e.target.value })}
          error={errors.phone}
          maxLength={25}
          disabled={disabled}
        />
        <Input
          label={t('fields.workplace')}
          value={value.workplace}
          onChange={(e) => set({ workplace: e.target.value })}
          maxLength={120}
          disabled={disabled}
        />
        <Input
          label={t('fields.position')}
          value={value.position}
          onChange={(e) => set({ position: e.target.value })}
          maxLength={120}
          disabled={disabled}
          className="sm:col-span-2"
        />
      </div>
    </fieldset>
  );
}
