import { api } from './client';

/**
 * The fixed multi-month windows GET /analytics accepts. Anything else it treats
 * as a single `YYYY-MM` month — the two shapes return *different* sections
 * (see AnalyticsData).
 */
export const ANALYTICS_RANGES = ['3m', '6m', '1y', 'all'] as const;
export type AnalyticsRange = (typeof ANALYTICS_RANGES)[number];

/** A multi-month range (`3m`/`6m`/`1y`/`all`) or a single `YYYY-MM` month. */
export type AnalyticsPeriod = AnalyticsRange | string;

/**
 * Mirrors the backend's own branch (`analytics_service.get_analytics_data`):
 * anything ending in `m`/`y`, plus the literal `all`, is a range; everything
 * else is parsed as `YYYY-MM`. Keep these in lockstep — the returned payload's
 * populated sections depend entirely on which side of this test you land on.
 */
export function isRangePeriod(period: AnalyticsPeriod): period is AnalyticsRange {
  return period.endsWith('m') || period.endsWith('y') || period === 'all';
}

/** All-time context, returned for both period shapes. */
export type AnalyticsOverview = {
  /** The single biggest month on record, or null when there's no spend at all. */
  highestSpendMonth: { month: string; actual: number } | null;
  averageSpendPerMonth: number;
};

/**
 * Cumulative spend by day-of-month for three series: the current month so far,
 * the previous month, and the mean across the requested window's months.
 * `current` is null past today; `previous`/`average` are null on days the source
 * months don't have (the backend pads to 31 and NaNs get JSON-nulled).
 */
export type VelocityPoint = {
  day: number;
  current: number | null;
  previous: number | null;
  average: number | null;
};

/** Cumulative spend by day split at the ₹1,000 mark — small vs large purchases. */
export type CompositionPoint = {
  day: number;
  cumulative_small: number | null;
  cumulative_large: number | null;
};

/** One category's cost-vs-frequency profile, plotted as a quadrant scatter. */
export type HabitPoint = {
  category: string;
  transaction_count: number;
  total_spend: number;
  average_spend: number;
};

/** One category's share of the window's spend. `percentage` is already 0–100. */
export type CategoryDistributionPoint = {
  category: string;
  total: number;
  percentage: number;
  icon_name: string | null;
};

/** A day that had spend. Days with none are simply absent from the array. */
export type HeatmapPoint = { date: string; spend: number };

export type MonthlyBreakdownPoint = { month: string; spend: number };

/**
 * Response shape of GET /analytics. Confirmed against the backend service —
 * the route has no `response_model`, so it's absent from the OpenAPI schema,
 * and both DOCUMENTATION.md and BROTHER-HANDOFF.md describe it wrongly (they
 * list snake_case keys and a `budget_vs_spend` section that doesn't exist).
 *
 * Every key is always present, but which ones carry data depends on the period:
 *
 * | section              | range (`3m`/`6m`/`1y`/`all`) | month (`YYYY-MM`) |
 * |----------------------|:---------------------------:|:-----------------:|
 * | `overview`           | ✅ (all-time, period-independent) | ✅          |
 * | `habitIdentifier`    | ✅                          | ✅                |
 * | `categoryDistribution`| ✅                         | ✅                |
 * | `transactionHeatmap` | ✅ (spans months)           | ✅                |
 * | `spendingVelocity`   | ✅                          | `[]`              |
 * | `monthlyBreakdown`   | ✅                          | `[]`              |
 * | `spendingComposition`| `[]`                        | ✅                |
 */
export type AnalyticsData = {
  overview: AnalyticsOverview;
  spendingVelocity: VelocityPoint[];
  spendingComposition: CompositionPoint[];
  habitIdentifier: HabitPoint[];
  categoryDistribution: CategoryDistributionPoint[];
  transactionHeatmap: HeatmapPoint[];
  monthlyBreakdown: MonthlyBreakdownPoint[];
};

/**
 * GET /analytics?time_period=…&include_capital_transfers=…
 *
 * `includeCapitalTransfers` false (the default, matching the backend and the web
 * app) drops transactions tagged "Exclude from Analytics" so big account-to-
 * account moves don't swamp the real spending picture.
 */
export async function getAnalytics(
  period: AnalyticsPeriod,
  includeCapitalTransfers = false,
): Promise<AnalyticsData> {
  const { data } = await api.get<AnalyticsData>('/analytics', {
    params: { time_period: period, include_capital_transfers: includeCapitalTransfers },
  });
  return data;
}
