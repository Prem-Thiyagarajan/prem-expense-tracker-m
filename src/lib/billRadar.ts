import type { Transaction } from '@/api/transactions';
import { cleanMerchant } from './merchant';
import { currentMonth, daysInMonth } from './month';

export type IncomingBill = {
  key: string;
  merchant: string;
  predictedDay: number;
  predictedAmount: number;
  /** True when past amounts varied enough that the prediction is a rough guess. */
  amountVaries: boolean;
};

/** A merchant needs to recur in at least this many of the prior months to count. */
const MIN_PRIOR_MONTHS = 2;
/** Amount spread (max-min ÷ median) above this marks the prediction as approximate. */
const VARIANCE_THRESHOLD = 0.1;

function median(nums: number[]): number {
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Recurring-bill detection: groups debit transactions by cleaned merchant name
 * and flags the ones that landed in at least `MIN_PRIOR_MONTHS` of the prior
 * months at a fairly consistent day-of-month, but haven't shown up yet this
 * month — i.e. still "incoming". `transactions` should already span the
 * current month plus a few months back (see `useBillRadar`, which fetches that
 * window).
 *
 * There's no backend support for this (no recurring-transaction concept in the
 * API) — it's inferred purely from ordinary transaction history, client-side.
 */
export function detectIncomingBills(transactions: Transaction[], today: Date): IncomingBill[] {
  const month = currentMonth();
  const todayDay = today.getDate();

  const byMerchant = new Map<string, Transaction[]>();
  for (const txn of transactions) {
    const name = cleanMerchant(txn.description);
    if (!name || name === 'Transaction') continue;
    const list = byMerchant.get(name) ?? [];
    list.push(txn);
    byMerchant.set(name, list);
  }

  const results: IncomingBill[] = [];
  for (const [merchant, txns] of byMerchant) {
    const prior = txns.filter((t) => t.txn_date.slice(0, 7) < month);
    const thisMonth = txns.filter((t) => t.txn_date.slice(0, 7) === month);
    if (thisMonth.length > 0) continue; // already paid this month

    const priorMonths = new Set(prior.map((t) => t.txn_date.slice(0, 7)));
    if (priorMonths.size < MIN_PRIOR_MONTHS) continue;

    const days = prior.map((t) => new Date(t.txn_date).getDate());
    const amounts = prior.map((t) => t.amount);
    const predictedDay = Math.min(
      Math.round(days.reduce((s, d) => s + d, 0) / days.length),
      daysInMonth(month),
    );
    if (predictedDay < todayDay) continue; // would already be overdue — not "incoming"

    const predictedAmount = median(amounts);
    const spread = Math.max(...amounts) - Math.min(...amounts);
    const amountVaries = predictedAmount > 0 && spread / predictedAmount > VARIANCE_THRESHOLD;

    results.push({ key: merchant, merchant, predictedDay, predictedAmount, amountVaries });
  }

  return results.sort((a, b) => a.predictedDay - b.predictedDay);
}
