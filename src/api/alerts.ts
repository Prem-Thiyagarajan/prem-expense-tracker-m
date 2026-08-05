import { api } from './client';
import type { Category } from './categories';

/** A budget goal as embedded on a budget-type alert (see backend GoalOut). */
export type AlertGoal = {
  id: number;
  user_id: number;
  category_id: number;
  month: string; // YYYY-MM
  limit_amount: number;
  category: Category;
};

export type AlertType = 'budget' | 'new_category';

/** One notification — matches backend AlertOut. */
export type Alert = {
  id: number;
  user_id: number;
  type: AlertType;
  goal_id: number | null;
  /** Present on `budget` alerts: 75, 90, or 100. */
  threshold_percentage: number | null;
  /** Present on `new_category` alerts: `{ category_name: string }`. */
  context: Record<string, unknown> | null;
  triggered_at: string | null; // ISO datetime
  is_acknowledged: boolean;
  /** Present on `budget` alerts — the goal that was crossed. */
  goal: AlertGoal | null;
};

/** GET /alerts — every alert, read or not. */
export async function getAllAlerts(): Promise<Alert[]> {
  const { data } = await api.get<Alert[]>('/alerts/');
  return data;
}

/** GET /alerts/unread — only unacknowledged alerts, newest first. */
export async function getUnreadAlerts(): Promise<Alert[]> {
  const { data } = await api.get<Alert[]>('/alerts/unread');
  return data;
}

/** PUT /alerts/{id}/acknowledge — marks one alert as read. */
export async function acknowledgeAlert(id: number): Promise<Alert> {
  const { data } = await api.put<Alert>(`/alerts/${id}/acknowledge`);
  return data;
}
