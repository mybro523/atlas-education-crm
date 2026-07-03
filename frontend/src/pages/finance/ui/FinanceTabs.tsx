import { useTranslation } from 'react-i18next';

import { cn } from '@/shared/lib/cn';
import { FINANCE_TABS, type FinanceTab } from '../model/tabs';

export interface FinanceTabsProps {
  active: FinanceTab;
  onChange: (tab: FinanceTab) => void;
}

/**
 * Horizontal, scrollable tab bar for the finance subviews. Scrolls sideways on
 * narrow screens so all five tabs stay reachable at 320px.
 */
export function FinanceTabs({ active, onChange }: FinanceTabsProps) {
  const { t } = useTranslation();

  return (
    <div
      role="tablist"
      aria-label={t('finance.title')}
      className="mb-5 -mx-1 flex gap-1 overflow-x-auto border-b border-border px-1"
    >
      {FINANCE_TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={cn(
              'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              isActive
                ? 'border-primary text-primary'
                : 'border-transparent text-foreground-muted hover:text-foreground',
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {t(tab.labelKey)}
          </button>
        );
      })}
    </div>
  );
}
