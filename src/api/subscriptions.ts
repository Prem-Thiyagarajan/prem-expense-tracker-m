import { api } from './client';

export type SubscriptionInterval = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';

/** Response shape of GET /subscriptions (see backend subscription_schema.py SubscriptionOut). */
export type Subscription = {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
  amount: number;
  interval: SubscriptionInterval;
  first_due_date: string; // YYYY-MM-DD
  last_paid_date: string | null; // YYYY-MM-DD — the most recently confirmed cycle
  is_active: boolean;
  // Computed server-side each read — not stored columns.
  upcoming_due_date: string; // YYYY-MM-DD
  overdue_due_date: string | null; // YYYY-MM-DD — set when a cycle was missed
};

export type SubscriptionCreate = {
  name: string;
  description?: string | null;
  amount: number;
  interval: SubscriptionInterval;
  /** "This month's payment date" — becomes the recurrence anchor. */
  first_due_date: string;
  /** "Last month's payment date", optional — seeds `last_paid_date`. */
  last_paid_date?: string | null;
};

export type SubscriptionUpdate = Partial<
  Pick<SubscriptionCreate, 'name' | 'description' | 'amount' | 'interval'>
> & { is_active?: boolean };

/** GET /subscriptions — active subscriptions by default. */
export async function getSubscriptions(includeInactive = false): Promise<Subscription[]> {
  const { data } = await api.get<Subscription[]>('/subscriptions/', {
    params: { include_inactive: includeInactive },
  });
  return data;
}

/** POST /subscriptions — create a subscription. */
export async function createSubscription(input: SubscriptionCreate): Promise<Subscription> {
  const { data } = await api.post<Subscription>('/subscriptions/', input);
  return data;
}

/** PUT /subscriptions/{id} — update a subscription (or cancel via is_active: false). */
export async function updateSubscription(id: number, input: SubscriptionUpdate): Promise<Subscription> {
  const { data } = await api.put<Subscription>(`/subscriptions/${id}`, input);
  return data;
}

/** DELETE /subscriptions/{id}. */
export async function deleteSubscription(id: number): Promise<void> {
  await api.delete(`/subscriptions/${id}`);
}

/**
 * PUT /subscriptions/{id}/pay — confirms a cycle paid. Omit `paidForDate` to
 * confirm whichever cycle the backend currently considers due (overdue if
 * there is one, else the upcoming one).
 */
export async function markSubscriptionPaid(id: number, paidForDate?: string): Promise<Subscription> {
  const { data } = await api.put<Subscription>(`/subscriptions/${id}/pay`, {
    paid_for_date: paidForDate ?? null,
  });
  return data;
}
