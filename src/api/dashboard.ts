import { api } from './client';

/** One of the top spending categories for the month. */
export type TopCategory = {
  id: number;
  category: string;
  amount: number;
  icon_name: string | null;
};

/** Cumulative-spend point (day-of-month → running total). Charted in M5. */
export type TrendPoint = { day: number; cumulative_spend: number };

export type RecentTransaction = {
  id: number;
  description: string | null;
  amount: number;
  txn_date: string; // ISO date
  category_id: number | null;
};

/** Response shape of GET /dashboard (see backend dashboard_service.py). */
export type DashboardData = {
  totalSpent: number;
  percentChangeFromLastMonth: number;
  dailyAverageSpend: number;
  projectedMonthlySpend: number;
  topSpendingCategories: TopCategory[];
  spendingTrend: TrendPoint[];
  recentTransactions: RecentTransaction[];
};

/** GET /dashboard?month=YYYY-MM — KPI metrics + lists for the selected month. */
export async function getDashboard(month: string): Promise<DashboardData> {
  const { data } = await api.get<DashboardData>('/dashboard', { params: { month } });
  return data;
}
