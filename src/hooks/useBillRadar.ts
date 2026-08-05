import { useQuery } from '@tanstack/react-query';

import { getTransactions } from '@/api/transactions';
import { detectIncomingBills } from '@/lib/billRadar';
import { currentMonth, monthRange, shiftMonth } from '@/lib/month';

/** How many full months back to mine for a recurring pattern. */
const LOOKBACK_MONTHS = 3;

/**
 * Bills likely to land before the current month is out, inferred from
 * recurring merchant activity over the last few months (see
 * `detectIncomingBills`). Only meaningful for the live month — a completed or
 * future month has nothing left to predict — so this ignores the app-wide
 * month switcher and always looks at "now".
 */
export function useBillRadar() {
  const month = currentMonth();
  const { start } = monthRange(shiftMonth(month, -LOOKBACK_MONTHS));
  const { end } = monthRange(month);

  return useQuery({
    queryKey: ['billRadar', month],
    queryFn: async () => {
      // One-shot fetch across the whole lookback window (mirrors the
      // single-request-per-month pattern in useTransactions, just wider).
      const page = await getTransactions({
        page: 1,
        limit: 2000,
        type: 'debit',
        start_date: start,
        end_date: end,
      });
      return detectIncomingBills(page.transactions, new Date());
    },
    staleTime: 30 * 60_000,
  });
}
