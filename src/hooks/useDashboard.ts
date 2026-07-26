import { useQuery } from '@tanstack/react-query';

import { getDashboard } from '@/api/dashboard';
import { monthStaleTime } from '@/lib/month';
import { usePrefetchNeighbourMonths, useScreenFocused } from './useMonthWindow';

/**
 * Dashboard data for a `YYYY-MM` month, cached per month.
 *
 * `placeholderData` hands back the previously-shown month while the new one
 * loads. Without it every month change is a brand-new query key, so the screen
 * has no data, drops to its skeleton, and rebuilds the whole layout — including
 * re-measuring every chart via onLayout. Screens dim while `isPlaceholderData`
 * is true so a stale month is never shown as if it were live.
 *
 * The query itself is never gated on focus: a background tab must still track
 * the shared month, or the tabs end up disagreeing about which month they show.
 * Only the neighbour prefetch — pure cache warming — is focus-gated.
 */
export function useDashboard(month: string) {
  const focused = useScreenFocused();

  usePrefetchNeighbourMonths(month, focused, (m) => ({
    queryKey: ['dashboard', m],
    queryFn: () => getDashboard(m),
  }));

  return useQuery({
    queryKey: ['dashboard', month],
    queryFn: () => getDashboard(month),
    staleTime: monthStaleTime(month),
    placeholderData: (previous) => previous,
  });
}
