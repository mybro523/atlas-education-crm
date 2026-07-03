import { CURRENCY } from '@/shared/config';

/**
 * Money & date formatting helpers shared across the finance section. Currency is
 * TJS (shared `CURRENCY`, API_CONTRACT). Values may arrive as `number` or as a
 * Prisma `Decimal` serialized to a string, so everything is coerced defensively.
 *
 * Lives in `shared` so widgets, pages and features can all import it via
 * downward-only FSD imports.
 */

/** Coerce a possibly-string/undefined decimal to a finite number. */
export function toNumber(value: unknown): number {
  const n = typeof value === 'string' ? Number(value) : (value as number);
  return Number.isFinite(n) ? n : 0;
}

/** Format an amount as grouped TJS, e.g. `12 500,00 TJS`. */
export function formatMoney(value: unknown): string {
  const n = toNumber(value);
  const formatted = new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
  return `${formatted} ${CURRENCY}`;
}

/** Compact money for chart axes/tooltips (e.g. `12 500 TJS`). */
export function formatMoneyShort(value: unknown): string {
  const n = toNumber(value);
  const formatted = new Intl.NumberFormat('ru-RU', {
    maximumFractionDigits: 0,
  }).format(n);
  return `${formatted} ${CURRENCY}`;
}

/** Trim an ISO datetime to the `YYYY-MM-DD` a native date input expects. */
export function toDateInput(value?: string | null): string {
  if (!value) return '';
  return value.slice(0, 10);
}

/** Locale-aware short date; falls back to an em dash. */
export function formatDate(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
}

/** Render a billing/salary period as `start – end`. */
export function formatPeriod(
  start?: string | null,
  end?: string | null,
): string {
  return `${formatDate(start)} – ${formatDate(end)}`;
}
