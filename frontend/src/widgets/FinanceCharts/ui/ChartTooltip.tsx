import type { TooltipProps } from 'recharts';

import { formatMoney } from '@/shared/lib';

/**
 * Themed recharts tooltip. recharts' default tooltip uses inline white styling
 * that breaks in dark mode, so we render our own surface: a frosted-glass panel
 * (translucent bg + backdrop blur) with a pop-in animation and a colored glow
 * dot per series. Every numeric value is formatted as TJS money.
 */
export function MoneyTooltip({
  active,
  payload,
  label,
}: TooltipProps<number, string>) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="animate-tooltip-pop rounded-xl border border-border/70 bg-surface/80 px-3.5 py-2.5 shadow-elevated backdrop-blur-md">
      {label != null && (
        <p className="mb-1.5 text-xs font-semibold text-foreground">
          {String(label)}
        </p>
      )}
      <ul className="space-y-1">
        {payload.map((entry) => (
          <li
            key={String(entry.dataKey ?? entry.name)}
            className="flex items-center gap-2 text-xs text-foreground"
          >
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{
                backgroundColor: entry.color,
                boxShadow: `0 0 6px ${entry.color}`,
              }}
              aria-hidden
            />
            <span className="text-foreground-muted">{entry.name}:</span>
            <span className="ml-auto pl-3 font-semibold tabular-nums">
              {formatMoney(entry.value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
