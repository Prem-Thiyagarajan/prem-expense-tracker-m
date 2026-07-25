import { api } from './client';

/**
 * One category's budget-vs-actual for the month. `budget: 0` means the user
 * hasn't set a limit for this category — filter those out before rendering
 * per-category cards. `progress` is `spent / budget * 100` (backend-computed).
 * `daysLeft` is a projected-depletion estimate: days until this category's
 * remaining budget runs out at the current daily spend rate.
 */
export type CategoryBudget = {
  categoryId: number;
  categoryName: string;
  icon_name: string | null;
  budget: number;
  spent: number;
  remaining: number;
  progress: number;
  daysLeft: number;
};

export type HistoricalSpendPoint = { month: string; totalSpend: number };

/** A suggested per-category limit, derived from the last 3 months' spend. */
export type SuggestedBudget = {
  categoryId: number;
  categoryName: string;
  icon_name: string | null;
  suggestedAmount: number;
  currentSpend: number;
};

/** Present only when no plan exists yet for the month — feeds the empty state. */
export type BudgetHistoricalData = {
  historicalSpend: HistoricalSpendPoint[];
  averageTotalSpend: number;
  suggestedBudgets: SuggestedBudget[];
};

/** Cumulative actual spend by day-of-month — present only once a plan exists. */
export type BudgetPacingPoint = { day: number; actualSpend: number };

/**
 * Response shape of GET /budgets/plan (see backend budget_plan_service.py).
 * `plan` is null until the user saves a budget for the month, in which case
 * `historicalData` is null instead and `pacingData` appears alongside `plan`.
 * Confirmed against a live response — not documented in the backend's OpenAPI
 * schema (the route has no response_model).
 */
export type BudgetPageData = {
  plan: CategoryBudget[] | null;
  historicalData: BudgetHistoricalData | null;
  pacingData?: BudgetPacingPoint[];
};

/** GET /budgets/plan?month=YYYY-MM */
export async function getBudgetPlan(month: string): Promise<BudgetPageData> {
  const { data } = await api.get<BudgetPageData>('/budgets/plan', { params: { month } });
  return data;
}

export type SaveBudgetItem = { category_id: number; limit_amount: number };

/** POST /budgets/plan — replaces the month's plan with the given per-category limits. */
export async function saveBudgetPlan(month: string, budgets: SaveBudgetItem[]): Promise<void> {
  await api.post('/budgets/plan', { month, budgets });
}
