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
