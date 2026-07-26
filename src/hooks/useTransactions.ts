import { useQuery } from '@tanstack/react-query';

import { getTransactions } from '@/api/transactions';
import { monthRange, monthStaleTime } from '@/lib/month';

// A month is fetched in one shot so the list can filter/search client-side
// (instant, no refetch) and the category grid can show accurate per-category
// counts. This ceiling comfortably covers a real month; `truncated` flags the
// rare overflow so the UI can hint that older rows are hidden.
const MONTH_LIMIT = 500;

/**
 * All of a month's transactions in one cached query (newest-first, per the
 * backend's default sort). Type/category/search filtering happens client-side
 * off this list, so switching filters never hits the network.
 *
 * See `useDashboard` for why `placeholderData` matters on month-keyed queries.
 */
export function useTransactions(month: string) {
  const { start, end } = monthRange(month);

  return useQuery({
    queryKey: ['transactions', month],
    queryFn: () =>
      getTransactions({ page: 1, limit: MONTH_LIMIT, start_date: start, end_date: end }),
    staleTime: monthStaleTime(month),
    placeholderData: (previous) => previous,
    select: (page) => ({
      transactions: page.transactions,
      totalCount: page.total_count,
      truncated: page.total_count > page.transactions.length,
    }),
  });
}
