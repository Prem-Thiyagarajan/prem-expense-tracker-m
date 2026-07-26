import { useIsFocused } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { currentMonth, monthStaleTime, shiftMonth } from '@/lib/month';

/** Delay before warming neighbours, so the visible month wins the network. */
const PREFETCH_DELAY = 350;

/**
 * True while this screen's tab is the visible one.
 *
 * Used to gate *speculative* work only — never the screen's own query. Gating
 * the real query on focus (or freezing blurred tabs) makes a screen miss the
 * shared month while it's in the background, and the tabs then disagree about
 * which month they're showing. Fetching is cheap (6-19ms measured); correctness
 * is not worth trading for it.
 */
export function useScreenFocused(): boolean {
  return useIsFocused();
}

/**
 * Warms the months either side of `month` so paging with the ‹ › arrows is
 * served from cache instead of the network.
 *
 * Only runs for the focused tab, and only after a short delay, so the month the
 * user is actually looking at isn't competing with two speculative fetches.
 * Future months are skipped — the app never pages past the current one.
 */
export function usePrefetchNeighbourMonths(
  month: string,
  enabled: boolean,
  build: (month: string) => { queryKey: unknown[]; queryFn: () => Promise<unknown> },
) {
  const queryClient = useQueryClient();
  // `build` closes over props and is a fresh function every render; holding it
  // in a ref keeps it out of the dependency list so the effect tracks the month.
  const buildRef = useRef(build);
  buildRef.current = build;

  useEffect(() => {
    if (!enabled) return;

    const timer = setTimeout(() => {
      const neighbours = [shiftMonth(month, -1)];
      const next = shiftMonth(month, 1);
      if (next <= currentMonth()) neighbours.push(next);

      for (const neighbour of neighbours) {
        const { queryKey, queryFn } = buildRef.current(neighbour);
        queryClient.prefetchQuery({
          queryKey,
          queryFn,
          staleTime: monthStaleTime(neighbour),
        });
      }
    }, PREFETCH_DELAY);

    return () => clearTimeout(timer);
  }, [month, enabled, queryClient]);
}
