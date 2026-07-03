import type { ComponentType } from 'react';
import { cn } from '@/shared/lib/cn';

export interface CabinetTab {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

export interface CabinetTabsProps {
  tabs: CabinetTab[];
  active: string;
  onChange: (id: string) => void;
}

/**
 * Segmented, scrollable tab bar for the student cabinet.
 * - Horizontally scrollable on tiny screens (no wrap, no overflow at 320px).
 * - Fully themed for light + dark mode; active tab uses the brand primary.
 */
export function CabinetTabs({ tabs, active, onChange }: CabinetTabsProps) {
  return (
    <div
      role="tablist"
      aria-orientation="horizontal"
      className="mb-5 flex gap-1 overflow-x-auto rounded-xl border border-border bg-surface p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {tabs.map((tab) => {
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
              'inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              isActive
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-foreground-muted hover:bg-surface-muted hover:text-foreground',
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
