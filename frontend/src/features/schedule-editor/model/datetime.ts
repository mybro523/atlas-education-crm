/**
 * Local date/time <-> ISO helpers for the lesson form and weekly grid.
 * The API stores `startsAt`/`endsAt` as ISO-8601 UTC strings; the form works in
 * the user's local timezone with separate date + time fields.
 */

/** `YYYY-MM-DD` for the given date in local time (for <input type="date">). */
export function toDateInput(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** `HH:mm` for the given date in local time (for <input type="time">). */
export function toTimeInput(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${min}`;
}

/** Combine a local `YYYY-MM-DD` + `HH:mm` into an ISO-8601 UTC string. */
export function combineToIso(dateStr: string, timeStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = timeStr.split(':').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0, 0, 0).toISOString();
}

/** Parse an ISO string into local `{ date, time }` input strings. */
export function fromIso(iso: string | null | undefined): {
  date: string;
  time: string;
} {
  if (!iso) return { date: '', time: '' };
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return { date: '', time: '' };
  return { date: toDateInput(dt), time: toTimeInput(dt) };
}
