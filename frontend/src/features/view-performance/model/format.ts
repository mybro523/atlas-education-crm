/**
 * Small formatting helpers for the student cabinet views.
 * Dates come from the API as ISO-8601 UTC strings; we render them in the
 * user's locale/timezone.
 */

/** Locale-aware date, e.g. "1 июл. 2026". Falls back to em-dash. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return '—';
  return dt.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** Locale-aware `HH:mm` time. Falls back to em-dash. */
export function formatTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return '—';
  return dt.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Start–end time range, e.g. "14:00 – 15:30" (or just start if no end). */
export function formatTimeRange(
  startsAt: string | null | undefined,
  endsAt: string | null | undefined,
): string {
  const start = formatTime(startsAt);
  if (!endsAt) return start;
  return `${start} – ${formatTime(endsAt)}`;
}

/** Round to one decimal place for average-grade display (e.g. 4.5, 4.0). */
export function formatAverage(value: number): string {
  if (!Number.isFinite(value) || value === 0) return '—';
  return value.toFixed(1);
}

/** Badge variant driven by a 2..5 grade value (5-point scale). */
export function gradeVariant(
  value: number,
): 'success' | 'primary' | 'warning' | 'danger' | 'muted' {
  if (value >= 5) return 'success';
  if (value >= 4) return 'primary';
  if (value >= 3) return 'warning';
  if (value >= 2) return 'danger';
  return 'muted';
}
