import { useQuery } from '@tanstack/react-query';

import { getDashboard } from '@/api/dashboard';

/** Dashboard data for a `YYYY-MM` month, cached per month. */
export function useDashboard(month: string) {
  return useQuery({
    queryKey: ['dashboard', month],
    queryFn: () => getDashboard(month),
    staleTime: 60_000,
  });
}
