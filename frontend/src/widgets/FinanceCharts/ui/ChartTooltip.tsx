import type { TooltipProps } from 'recharts';

import { formatMoney } from '@/shared/lib';

/**
 * Themed recharts tooltip. recharts' default tooltip uses inline white styling
 * that breaks in dark mode, so we render our own themed surface and format every
 * numeric value as TJS money.
 */
export function MoneyTooltip({
  active,
  payload,
  label,
}: TooltipProps<number, string>) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 shadow-card">
      {label != null && (
        <p className="mb-1 text-xs font-medium text-foreground-muted">
          {String(label)}
        </p>
      )}
      <ul className="space-y-0.5">
        {payload.map((entry) => (
          <li
            key={String(entry.dataKey ?? entry.name)}
            className="flex items-center gap-2 text-xs text-foreground"
          >
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: entry.color }}
              aria-hidden
            />
            <span className="text-foreground-muted">{entry.name}:</span>
            <span className="ml-auto font-medium tabular-nums">
              {formatMoney(entry.value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
