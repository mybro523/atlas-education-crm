import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';

import { Input, Button } from '@/shared/ui';

export interface DateRange {
  from: string;
  to: string;
}

export interface DateRangeFilterProps {
  value: DateRange;
  onChange: (next: DateRange) => void;
  className?: string;
}

/**
 * A from/to date-range picker used across finance subviews. Both bounds
 * optional; a clear button resets them. Mobile-first — inputs stack under 425px.
 */
export function DateRangeFilter({
  value,
  onChange,
  className,
}: DateRangeFilterProps) {
  const { t } = useTranslation();
  const hasRange = Boolean(value.from || value.to);

  return (
    <div
      className={
        'flex flex-col gap-3 sm:flex-row sm:items-end ' + (className ?? '')
      }
    >
      <div className="sm:w-44">
        <Input
          label={t('finance.filters.from')}
          type="date"
          value={value.from}
          onChange={(e) => onChange({ ...value, from: e.target.value })}
        />
      </div>
      <div className="sm:w-44">
        <Input
          label={t('finance.filters.to')}
          type="date"
          value={value.to}
          onChange={(e) => onChange({ ...value, to: e.target.value })}
        />
      </div>
      {hasRange && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onChange({ from: '', to: '' })}
          className="self-start sm:self-auto"
        >
          <X className="h-4 w-4" />
          {t('finance.filters.clear')}
        </Button>
      )}
    </div>
  );
}
