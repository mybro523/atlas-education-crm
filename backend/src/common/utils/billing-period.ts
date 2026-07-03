/**
 * Billing period helper.
 *
 * Business rule (from spec §4.5 / decision #17): tuition is paid MONTHLY, but
 * the billing month is anchored to the student's `enrollmentDate` — NOT the
 * calendar month. A student who enrolled on the 15th has periods that run
 * 15th → 15th of the following month. An unpaid elapsed period is a debt.
 *
 * `computeBillingPeriod` returns the period [start, end) that CONTAINS `ref`
 * (default: now), aligned to the enrollment day-of-month.
 *
 * Edge cases handled:
 *  - Enrollment day 29/30/31 in a shorter month clamps to the last day of that
 *    month (e.g. enrolled Jan 31 → Feb period ends on Feb 28/29).
 *  - `ref` before `enrollmentDate` returns the very first period (starting at
 *    enrollmentDate) rather than a negative period.
 *
 * All dates are treated in UTC to stay deterministic across server timezones.
 */

export interface BillingPeriod {
  /** Inclusive start of the billing period (anchored to enrollment day). */
  start: Date;
  /** Exclusive end of the billing period (== start of the next period). */
  end: Date;
}

/** Days in a given UTC month (0-based month index). */
function daysInUtcMonth(year: number, monthIndex: number): number {
  // Day 0 of next month == last day of this month.
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

/**
 * Build a UTC date at the given year/month using `anchorDay`, clamped to the
 * month's length, preserving the enrollment time-of-day.
 */
function anchoredDate(
  year: number,
  monthIndex: number,
  anchorDay: number,
  h: number,
  m: number,
  s: number,
  ms: number,
): Date {
  const maxDay = daysInUtcMonth(year, monthIndex);
  const day = Math.min(anchorDay, maxDay);
  return new Date(Date.UTC(year, monthIndex, day, h, m, s, ms));
}

/**
 * Compute the billing period that contains `ref`, anchored to `enrollmentDate`.
 *
 * @param enrollmentDate The student's enrollment date (period anchor).
 * @param ref            Reference instant (defaults to `new Date()`).
 */
export function computeBillingPeriod(
  enrollmentDate: Date,
  ref: Date = new Date(),
): BillingPeriod {
  const anchorDay = enrollmentDate.getUTCDate();
  const h = enrollmentDate.getUTCHours();
  const min = enrollmentDate.getUTCMinutes();
  const s = enrollmentDate.getUTCSeconds();
  const ms = enrollmentDate.getUTCMilliseconds();

  // Before enrollment: the first period always starts at enrollmentDate.
  if (ref.getTime() < enrollmentDate.getTime()) {
    const end = anchoredDate(
      enrollmentDate.getUTCFullYear(),
      enrollmentDate.getUTCMonth() + 1,
      anchorDay,
      h,
      min,
      s,
      ms,
    );
    return { start: new Date(enrollmentDate.getTime()), end };
  }

  // Start from the anchored date in ref's month, then step to the period that
  // actually contains ref.
  let year = ref.getUTCFullYear();
  let month = ref.getUTCMonth();
  let start = anchoredDate(year, month, anchorDay, h, min, s, ms);

  if (ref.getTime() < start.getTime()) {
    // ref is before this month's anchor → the period started last month.
    month -= 1;
    if (month < 0) {
      month = 11;
      year -= 1;
    }
    start = anchoredDate(year, month, anchorDay, h, min, s, ms);
  }

  const end = anchoredDate(year, month + 1, anchorDay, h, min, s, ms);
  return { start, end };
}
