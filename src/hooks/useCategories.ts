import { useQuery } from '@tanstack/react-query';

import { getCategories } from '@/api/categories';

/** All of the user's categories — a slow-changing lookup, cached 10m (CONVENTIONS §7). */
export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
    staleTime: 10 * 60_000,
  });
}
