import { useQuery } from '@tanstack/react-query';

import { getAccounts } from '@/api/accounts';

/** The user's bank accounts — a slow-changing lookup for row labels + Add. */
export function useAccounts() {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: getAccounts,
    staleTime: 10 * 60_000,
  });
}
