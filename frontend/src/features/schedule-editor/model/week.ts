/** Weekly-grid date helpers (Monday-first week). */

export interface Week {
  /** 7 dates, Monday → Sunday, at local midnight. */
  days: Date[];
  /** ISO start (Monday 00:00 local) — for the `from` lesson filter. */
  fromIso: string;
  /** ISO end (next Monday 00:00 local, exclusive) — for the `to` filter. */
  toIso: string;
}

/** Local midnight of the Monday of the week containing `ref`. */
export function startOfWeek(ref: Date): Date {
  const d = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  // getDay(): 0=Sun..6=Sat. Shift so Monday is the first day.
  const offset = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - offset);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Build the 7-day week (Mon→Sun) plus the ISO from/to range for filtering. */
export function buildWeek(ref: Date): Week {
  const start = startOfWeek(ref);
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    days.push(day);
  }
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return { days, fromIso: start.toISOString(), toIso: end.toISOString() };
}

/** Shift a reference date by N weeks. */
export function addWeeks(ref: Date, n: number): Date {
  const d = new Date(ref);
  d.setDate(d.getDate() + n * 7);
  return d;
}

/** i18n weekday keys in Monday-first order (schedule.weekdays.*). */
export const WEEKDAY_KEYS = [
  'mon',
  'tue',
  'wed',
  'thu',
  'fri',
  'sat',
  'sun',
] as const;

/** True if the two dates fall on the same local calendar day. */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
