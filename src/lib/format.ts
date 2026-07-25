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

/** Short day label from an ISO date/datetime string, e.g. "12 Jul". */
export function formatShortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** Compact ₹k axis label: 0 → "₹0", 11000 → "₹11k", 21744 → "₹22k". */
export function formatINRCompact(v: number): string {
  if (v < 1000) return `₹${Math.round(v)}`;
  const k = v / 1000;
  return `₹${k >= 10 ? Math.round(k) : Number(k.toFixed(1))}k`;
}
