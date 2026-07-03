import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import type { Subject } from '@/entities/subject';

export interface SubjectMultiSelectProps {
  subjects: Subject[];
  /** Selected subject ids. */
  value: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  label?: string;
}

/**
 * Accessible chip/checkbox group to pick multiple subjects. Toggling a chip
 * flips its id in `value`. Fully themed + wraps cleanly on 320px.
 */
export function SubjectMultiSelect({
  subjects,
  value,
  onChange,
  disabled = false,
  label,
}: SubjectMultiSelectProps) {
  const { t } = useTranslation();
  const toggle = (id: string) => {
    if (disabled) return;
    onChange(
      value.includes(id) ? value.filter((v) => v !== id) : [...value, id],
    );
  };

  return (
    <div className="w-full">
      {label && (
        <span className="mb-1.5 block text-sm font-medium text-foreground">
          {label}
        </span>
      )}
      {subjects.length === 0 ? (
        <p className="text-sm text-foreground-muted">
          {t('teachers.noSubjects')}
        </p>
      ) : (
        <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
          {subjects.map((s) => {
            const selected = value.includes(s.id);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => toggle(s.id)}
                disabled={disabled}
                aria-pressed={selected}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  'disabled:cursor-not-allowed disabled:opacity-60',
                  selected
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-surface text-foreground hover:bg-surface-muted',
                )}
              >
                {selected && <Check className="h-3.5 w-3.5" aria-hidden />}
                {s.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
