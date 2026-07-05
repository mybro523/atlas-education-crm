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

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Local midnight of the given date. */
export function startOfDay(ref: Date): Date {
  return new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
}

/** Shift a reference date by N days. */
export function addDays(ref: Date, n: number): Date {
  const d = new Date(ref);
  d.setDate(d.getDate() + n);
  return d;
}

/** Shift a reference date by N months (snaps to the 1st to avoid overflow). */
export function addMonths(ref: Date, n: number): Date {
  return new Date(ref.getFullYear(), ref.getMonth() + n, 1);
}

/** A single-day window [midnight, next-midnight) as ISO strings. */
export interface DayRange {
  day: Date;
  fromIso: string;
  toIso: string;
}

/** Build the ISO from/to window for a single local calendar day. */
export function buildDay(ref: Date): DayRange {
  const start = startOfDay(ref);
  const end = addDays(start, 1);
  return { day: start, fromIso: start.toISOString(), toIso: end.toISOString() };
}

/**
 * Month calendar grid (Monday-first). Covers the whole visible month rounded
 * out to full weeks, so the grid always renders complete rows.
 */
export interface MonthGrid {
  /** First day of the target month (local midnight). */
  monthStart: Date;
  /** 0-11 month index of the target month. */
  monthIndex: number;
  /** Rows of 7 dates each (Mon→Sun). */
  weeks: Date[][];
  /** Flat list of every day in the grid. */
  days: Date[];
  /** ISO grid start (Monday 00:00 local) — for the `from` filter. */
  fromIso: string;
  /** ISO grid end (exclusive) — for the `to` filter. */
  toIso: string;
}

/** Build the month calendar grid containing `ref`. */
export function buildMonthGrid(ref: Date): MonthGrid {
  const monthStart = new Date(ref.getFullYear(), ref.getMonth(), 1);
  const gridStart = startOfWeek(monthStart);
  const monthEnd = new Date(ref.getFullYear(), ref.getMonth() + 1, 0); // last day
  const spanDays =
    Math.round((startOfDay(monthEnd).getTime() - gridStart.getTime()) / MS_PER_DAY) +
    1;
  const weekCount = Math.ceil(spanDays / 7);

  const days: Date[] = [];
  for (let i = 0; i < weekCount * 7; i++) {
    days.push(addDays(gridStart, i));
  }
  const weeks: Date[][] = [];
  for (let w = 0; w < weekCount; w++) {
    weeks.push(days.slice(w * 7, w * 7 + 7));
  }
  const gridEnd = addDays(gridStart, weekCount * 7);

  return {
    monthStart,
    monthIndex: monthStart.getMonth(),
    weeks,
    days,
    fromIso: gridStart.toISOString(),
    toIso: gridEnd.toISOString(),
  };
}
