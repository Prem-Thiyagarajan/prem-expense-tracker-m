import { MONTHS } from './month';

/**
 * Indian-format an amount with a ₹ prefix (e.g. 812400 → "₹8,12,400").
 * Hand-rolled grouping to avoid relying on Intl locale data in Hermes.
 */
export function formatINR(amount: number, decimals = false): string {
  const neg = amount < 0;
  const abs = Math.abs(amount);
  const fixed = decimals ? abs.toFixed(2) : String(Math.round(abs));
  const [intPart, decPart] = fixed.split('.');
  const grouped = intPart.replace(/(\d)(?=(\d\d)+\d$)/g, '$1,');
  return `${neg ? '-' : ''}₹${decPart ? `${grouped}.${decPart}` : grouped}`;
}

/** Compact ₹k axis label: 0 → "₹0", 11000 → "₹11k", 21744 → "₹22k". */
export function formatINRCompact(v: number): string {
  if (v < 1000) return `₹${Math.round(v)}`;
  const k = v / 1000;
  return `₹${k >= 10 ? Math.round(k) : Number(k.toFixed(1))}k`;
}

/** Short day label from an ISO date/datetime string, e.g. "12 Jul". */
export function formatShortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

/** Today's local calendar day as `YYYY-MM-DD`. */
export function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Shift a `YYYY-MM-DD` key by whole days (negative = earlier). */
export function shiftDay(key: string, delta: number): string {
  const [y, m, d] = key.split('-').map(Number);
  const next = new Date(y, m - 1, d + delta);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`;
}

/** Local `YYYY-MM-DD` key for grouping a datetime by calendar day. */
export function dayKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Ruled day-header label: "Today", "Yesterday", else "Fri, 12 Jul". */
export function formatDayHeader(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const today = new Date();
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOf(today) - startOf(d)) / 86_400_000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}
