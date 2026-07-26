import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { getAnalytics } from '@/api/analytics';
import { getBudgetPlan } from '@/api/budget';
import { getDashboard } from '@/api/dashboard';
import { getTransactions } from '@/api/transactions';
import { MONTH_LIMIT } from '@/hooks/useTransactions';
import { monthRange, monthStaleTime } from '@/lib/month';
import { useMonth } from './MonthProvider';

/**
 * Fetches every tab's data for the selected month, from above the navigator.
 *
 * The month is shared, but each tab only *reads* it while it's rendering — and
 * blurred tabs are frozen, so they never see the change until you switch to
 * them. That left a tab showing the previous month's figures under the new
 * month's header while it caught up.
 *
 * This lives outside the frozen subtree, so it always runs: by the time you
 * switch tabs the data is already cached and the screen renders correct numbers
 * on its first frame. It's only affordable because these endpoints are cheap —
 * measured at 6-19ms each against real data. The expensive part was always
 * rendering four screens at once, which `freezeOnBlur` handles separately.
 *
 * Renders nothing.
 */
export function MonthWarmer() {
  const { month } = useMonth();
  const queryClient = useQueryClient();

  useEffect(() => {
    const { start, end } = monthRange(month);
    const staleTime = monthStaleTime(month);

    // Prefetched one call at a time rather than over an array: each endpoint
    // returns a different shape, and a heterogeneous array collapses them into a
    // union that no longer matches any single query's type.
    queryClient.prefetchQuery({
      queryKey: ['dashboard', month],
      queryFn: () => getDashboard(month),
      staleTime,
    });
    queryClient.prefetchQuery({
      queryKey: ['budgets', month],
      queryFn: () => getBudgetPlan(month),
      staleTime,
    });
    queryClient.prefetchQuery({
      queryKey: ['transactions', month],
      queryFn: () =>
        getTransactions({ page: 1, limit: MONTH_LIMIT, start_date: start, end_date: end }),
      staleTime,
    });
    // Analytics is warmed for the default transfers setting only; toggling it on
    // Trends is a deliberate act there and can afford its own round trip.
    queryClient.prefetchQuery({
      queryKey: ['analytics', month, false],
      queryFn: () => getAnalytics(month, false),
      staleTime,
    });
  }, [month, queryClient]);

  return null;
}
