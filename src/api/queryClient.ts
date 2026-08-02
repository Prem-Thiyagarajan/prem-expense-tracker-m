import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

/**
 * Invalidate every cache derived from transactions (CONVENTIONS §7).
 *
 * Adding, editing or deleting a transaction moves the month's spend, which
 * feeds the expenses list, the dashboard, the budget plan's `spent`/`progress`
 * and the analytics charts. Because month queries set their own `staleTime` and
 * nothing refetches on focus, a key missing from this set leaves that screen
 * showing pre-write numbers until the app restarts — the budget page read
 * "100% available" after an add for exactly that reason.
 *
 * Call this from every transaction write rather than listing keys inline, so a
 * new derived query only has to be added in one place.
 */
export function invalidateTransactionDerived(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: ['transactions'] });
  qc.invalidateQueries({ queryKey: ['dashboard'] });
  qc.invalidateQueries({ queryKey: ['budgets'] });
  qc.invalidateQueries({ queryKey: ['analytics'] });
}
