import { useQuery } from '@tanstack/react-query';

import { getAnalytics, isRangePeriod, type AnalyticsPeriod } from '@/api/analytics';
import { monthStaleTime } from '@/lib/month';
import { usePrefetchNeighbourMonths, useScreenFocused } from './useMonthWindow';

/**
 * Analytics for a period, cached per (period, transfers) pair — both are part of
 * the key because each combination is a distinct server aggregation.
 *
 * It's the heaviest endpoint in the app (roughly seven queries plus pandas per
 * call) but still answers in ~8-13ms on real data, so it runs on every month
 * change like the rest rather than being gated on focus — a background tab that
 * skips the update ends up disagreeing with the others about the month.
 *
 * `placeholderData` keeps the previous period's charts on screen while a new one
 * loads, so flipping between 3M/6M/1Y doesn't collapse the whole screen back to
 * the skeleton on every tap (CONVENTIONS §7 still applies to the first load).
 */
export function useAnalytics(period: AnalyticsPeriod, includeCapitalTransfers: boolean) {
  const focused = useScreenFocused();
  const isRange = isRangePeriod(period);

  // Only single-month periods have neighbours; a rolling range doesn't page.
  usePrefetchNeighbourMonths(period, focused && !isRange, (m) => ({
    queryKey: ['analytics', m, includeCapitalTransfers],
    queryFn: () => getAnalytics(m, includeCapitalTransfers),
  }));

  return useQuery({
    queryKey: ['analytics', period, includeCapitalTransfers],
    queryFn: () => getAnalytics(period, includeCapitalTransfers),
    // A closed month's analytics can't change on their own; a rolling range
    // always includes today, so it stays on the short window.
    staleTime: isRange ? 60_000 : monthStaleTime(period),
    placeholderData: (previous) => previous,
  });
}
