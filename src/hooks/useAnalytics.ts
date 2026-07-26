import { useQuery } from '@tanstack/react-query';

import { getAnalytics, isRangePeriod, type AnalyticsPeriod } from '@/api/analytics';
import { monthStaleTime } from '@/lib/month';

/**
 * Analytics for a period, cached per (period, transfers) pair — both are part of
 * the key because each combination is a distinct server aggregation.
 *
 * `placeholderData` keeps the previous period's charts on screen while a new one
 * loads, so flipping between 3M/6M/1Y doesn't collapse the whole screen back to
 * the skeleton on every tap (CONVENTIONS §7 still applies to the first load).
 */
export function useAnalytics(period: AnalyticsPeriod, includeCapitalTransfers: boolean) {
  return useQuery({
    queryKey: ['analytics', period, includeCapitalTransfers],
    queryFn: () => getAnalytics(period, includeCapitalTransfers),
    // A closed month's analytics can't change on their own; a rolling range
    // always includes today, so it stays on the short window.
    staleTime: isRangePeriod(period) ? 60_000 : monthStaleTime(period),
    placeholderData: (previous) => previous,
  });
}
