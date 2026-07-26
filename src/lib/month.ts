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

/**
 * How long a month's fetched data stays fresh. A month that has already ended
 * can only change if the user edits it — and every mutation invalidates its keys
 * explicitly (CONVENTIONS §7) — so past months cache far longer than the live
 * one. This is what makes paging back through history feel instant.
 */
export function monthStaleTime(month: string): number {
  return month < currentMonth() ? 30 * 60_000 : 60_000;
}

/**
 * Inclusive `start`/`end` date bounds (`YYYY-MM-DD`) for a `YYYY-MM` month —
 * used as the `start_date`/`end_date` params on GET /transactions.
 *
 * The list API filters `txn_date >= start_date AND txn_date <= end_date`, where
 * a bare date coerces to that day's midnight. Existing data (bank imports and
 * the web app's manual adds) stores `txn_date` at midnight, so an inclusive
 * `[first-of-month … last-of-month]` window captures exactly the month — and
 * matches the dashboard's half-open `[month_start, next_month_start)`. The Add
 * flow keeps this invariant by writing manual `txn_date`s at midnight too.
 */
export function monthRange(month: string): { start: string; end: string } {
  const [y, m] = month.split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate(); // day 0 of next month = last day of this
  const mm = String(m).padStart(2, '0');
  return { start: `${month}-01`, end: `${y}-${mm}-${String(lastDay).padStart(2, '0')}` };
}
