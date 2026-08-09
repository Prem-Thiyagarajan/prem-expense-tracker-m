import type { SubscriptionInterval } from '@/api/subscriptions';

/**
 * Client-side mirror of the backend's `subscription_service.py` recurrence
 * math — used only to compute an optimistic next state the instant you tap
 * Mark as paid/unpaid, so the button flips immediately instead of waiting on
 * a mutation round trip plus a refetch. The server's response (from the same
 * math) is still the source of truth once it lands.
 */

const INTERVAL_MONTHS: Partial<Record<SubscriptionInterval, number>> = {
  monthly: 1,
  quarterly: 3,
  yearly: 12,
};
const INTERVAL_DAYS: Partial<Record<SubscriptionInterval, number>> = {
  weekly: 7,
  biweekly: 14,
};

function daysInMonth(year: number, month1to12: number): number {
  return new Date(year, month1to12, 0).getDate();
}

function addMonths(dateKey: string, months: number): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const monthIndex = m - 1 + months;
  const year = y + Math.floor(monthIndex / 12);
  const month = ((monthIndex % 12) + 12) % 12 + 1;
  const day = Math.min(d, daysInMonth(year, month)); // clamp e.g. Jan 31 + 1mo -> Feb 28/29
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function addDays(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(y, m - 1, d + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

export function nextOccurrence(dateKey: string, interval: SubscriptionInterval): string {
  const months = INTERVAL_MONTHS[interval];
  if (months) return addMonths(dateKey, months);
  const days = INTERVAL_DAYS[interval];
  if (days) return addDays(dateKey, days);
  throw new Error(`Unknown subscription interval: ${interval}`);
}

export function previousOccurrence(dateKey: string, interval: SubscriptionInterval): string {
  const months = INTERVAL_MONTHS[interval];
  if (months) return addMonths(dateKey, -months);
  const days = INTERVAL_DAYS[interval];
  if (days) return addDays(dateKey, -days);
  throw new Error(`Unknown subscription interval: ${interval}`);
}

/** Mirrors the backend's `compute_status` exactly — see subscription_service.py. */
export function computeSubscriptionStatus(
  firstDueDate: string,
  interval: SubscriptionInterval,
  lastPaidDate: string | null,
  today: string,
): { upcoming: string; overdue: string | null } {
  let cursor = lastPaidDate ? nextOccurrence(lastPaidDate, interval) : firstDueDate;
  let overdue: string | null = null;
  while (cursor < today) {
    overdue = cursor;
    cursor = nextOccurrence(cursor, interval);
  }
  return { upcoming: cursor, overdue };
}
