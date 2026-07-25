/**
 * Month helpers. The app keys everything by a `YYYY-MM` string (matching the
 * backend's goals/budgets/dashboard params). Zero-padded, so plain string
 * comparison is chronological — no Date math needed for ordering.
 */

export const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

/** The current month as `YYYY-MM`. */
export function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/** Shift a `YYYY-MM` string by `delta` months (negative = earlier). */
export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Display label for a `YYYY-MM` string, e.g. "Jul '26". */
export function formatMonthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return `${MONTHS[m - 1]} '${String(y).slice(2)}`;
}

/** Number of days in a `YYYY-MM` month. */
export function daysInMonth(month: string): number {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

/**
 * How far into `month` "today" is: `elapsed` = today's day-of-month (capped at
 * the month length for past/future months), `total` = days in the month.
 * For a past month, `elapsed === total` (fully elapsed); for a future month,
 * `elapsed === 0` — the app never lets you page there, but this stays safe.
 */
export function monthProgress(month: string): { elapsed: number; total: number } {
  const total = daysInMonth(month);
  const today = currentMonth();
  if (month < today) return { elapsed: total, total };
  if (month > today) return { elapsed: 0, total };
  return { elapsed: new Date().getDate(), total };
}
