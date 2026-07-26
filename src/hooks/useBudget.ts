import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getBudgetPlan, saveBudgetPlan, type SaveBudgetItem } from '@/api/budget';
import { monthStaleTime } from '@/lib/month';
import { usePrefetchNeighbourMonths, useScreenFocused } from './useMonthWindow';

/**
 * Budget plan + pacing/suggestions for a `YYYY-MM` month, cached per month.
 * See `useDashboard` for what `placeholderData` and neighbour prefetching do
 * for month-keyed queries, and why the query itself is never focus-gated.
 */
export function useBudget(month: string) {
  const focused = useScreenFocused();

  usePrefetchNeighbourMonths(month, focused, (m) => ({
    queryKey: ['budgets', m],
    queryFn: () => getBudgetPlan(m),
  }));

  return useQuery({
    queryKey: ['budgets', month],
    queryFn: () => getBudgetPlan(month),
    staleTime: monthStaleTime(month),
    placeholderData: (previous) => previous,
  });
}

/**
 * Saves per-category limits for `month`. Invalidates the month's plan and the
 * dashboard — budget limits feed the dashboard's budget gauge, so any write
 * here changes its numbers too (CONVENTIONS §7).
 */
export function useSaveBudget(month: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (budgets: SaveBudgetItem[]) => saveBudgetPlan(month, budgets),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets', month] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
