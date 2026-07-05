import { useTranslation } from 'react-i18next';
import { Search, X } from 'lucide-react';
import { Input } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';

export interface StudentSearchProps {
  /** Current raw search text (controlled). */
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

/**
 * Single search box for the students list. Per the API contract (§6) the one
 * `search` term matches the student's first/last name OR any parent's workplace
 * (место работы) OR any parent's position/должность — so a single input covers
 * all of them, no separate fields.
 */
export function StudentSearch({ value, onChange, className }: StudentSearchProps) {
  const { t } = useTranslation();

  return (
    <div className={cn('relative w-full sm:max-w-xs', className)}>
      <Input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t('students.searchPlaceholder')}
        aria-label={t('students.searchPlaceholder')}
        leftIcon={<Search className="h-4 w-4" />}
        className={value ? 'pr-10' : undefined}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label={t('actions.clearSearch')}
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-foreground-muted transition-colors hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
