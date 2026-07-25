import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getBudgetPlan, saveBudgetPlan, type SaveBudgetItem } from '@/api/budget';

/** Budget plan + pacing/suggestions for a `YYYY-MM` month, cached per month. */
export function useBudget(month: string) {
  return useQuery({
    queryKey: ['budgets', month],
    queryFn: () => getBudgetPlan(month),
    staleTime: 60_000,
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
