import { useQuery } from '@tanstack/react-query';

import { getCategories } from '@/api/categories';

/**
 * The user's categories — a slow-changing lookup shared across Expenses, Add,
 * and Budget. Long stale time; rows are joined to transactions client-side.
 */
export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
    staleTime: 10 * 60_000,
  });
}
