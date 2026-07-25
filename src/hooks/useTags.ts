import { useQuery } from '@tanstack/react-query';

import { getTags } from '@/api/tags';

/** The user's tags — a slow-changing lookup for the Add sheet's tag picker. */
export function useTags() {
  return useQuery({
    queryKey: ['tags'],
    queryFn: getTags,
    staleTime: 10 * 60_000,
  });
}
