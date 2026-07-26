import { useQuery } from '@tanstack/react-query';

import { getDashboard } from '@/api/dashboard';
import { monthStaleTime } from '@/lib/month';

/**
 * Dashboard data for a `YYYY-MM` month, cached per month.
 *
 * `placeholderData` hands back the previously-shown month while the new one
 * loads. Without it every month change is a brand-new query key, so the screen
 * has no data, drops to its skeleton, and rebuilds the whole layout — including
 * re-measuring every chart via onLayout. Keeping the old data mounted means the
 * layout survives and only the numbers swap. Screens dim the content while
 * `isPlaceholderData` is true so a stale month is never shown as if it were live.
 */
export function useDashboard(month: string) {
  return useQuery({
    queryKey: ['dashboard', month],
    queryFn: () => getDashboard(month),
    staleTime: monthStaleTime(month),
    placeholderData: (previous) => previous,
  });
}
