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
