import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createSubscription,
  deleteSubscription,
  getSubscriptions,
  markSubscriptionPaid,
  unmarkSubscriptionPaid,
  updateSubscription,
  type Subscription,
  type SubscriptionCreate,
  type SubscriptionUpdate,
} from '@/api/subscriptions';
import { todayKey } from '@/lib/format';
import { computeSubscriptionStatus, previousOccurrence } from '@/lib/subscriptionRecurrence';

/** Active subscriptions — the manage list and Bill Radar both read this. */
export function useSubscriptions() {
  return useQuery({
    queryKey: ['subscriptions'],
    queryFn: () => getSubscriptions(false),
    staleTime: 5 * 60_000,
  });
}

export function useCreateSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SubscriptionCreate) => createSubscription(input),
    onSettled: () => qc.invalidateQueries({ queryKey: ['subscriptions'] }),
  });
}

export function useUpdateSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: SubscriptionUpdate }) => updateSubscription(id, input),
    onSettled: () => qc.invalidateQueries({ queryKey: ['subscriptions'] }),
  });
}

export function useDeleteSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteSubscription(id),
    onSettled: () => qc.invalidateQueries({ queryKey: ['subscriptions'] }),
  });
}

/**
 * Confirms a cycle paid — the "Mark as paid" button, and Bill Radar's
 * auto-match. Applies the same recurrence math the backend uses (see
 * `subscriptionRecurrence.ts`) to the cache immediately, so the button flips
 * on tap instead of waiting on a mutation round trip plus a refetch.
 */
export function useMarkSubscriptionPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, paidForDate }: { id: number; paidForDate?: string }) =>
      markSubscriptionPaid(id, paidForDate),
    onMutate: async ({ id, paidForDate }) => {
      await qc.cancelQueries({ queryKey: ['subscriptions'] });
      const previous = qc.getQueryData<Subscription[]>(['subscriptions']);
      qc.setQueryData<Subscription[]>(['subscriptions'], (old) =>
        (old ?? []).map((s) => {
          if (s.id !== id) return s;
          const confirmed = paidForDate ?? s.overdue_due_date ?? s.upcoming_due_date;
          // Mirrors the backend's own guard: never move last_paid_date backwards.
          const lastPaidDate = !s.last_paid_date || confirmed > s.last_paid_date ? confirmed : s.last_paid_date;
          const { upcoming, overdue } = computeSubscriptionStatus(s.first_due_date, s.interval, lastPaidDate, todayKey());
          return { ...s, last_paid_date: lastPaidDate, upcoming_due_date: upcoming, overdue_due_date: overdue };
        }),
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) qc.setQueryData(['subscriptions'], context.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['subscriptions'] }),
  });
}

/**
 * Undoes a mistaken "mark as paid" — steps the confirmed cycle back by one,
 * optimistically, the same way `useMarkSubscriptionPaid` does.
 */
export function useUnmarkSubscriptionPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => unmarkSubscriptionPaid(id),
    onMutate: async (id: number) => {
      await qc.cancelQueries({ queryKey: ['subscriptions'] });
      const previous = qc.getQueryData<Subscription[]>(['subscriptions']);
      qc.setQueryData<Subscription[]>(['subscriptions'], (old) =>
        (old ?? []).map((s) => {
          if (s.id !== id || !s.last_paid_date) return s;
          const lastPaidDate =
            s.last_paid_date <= s.first_due_date ? null : previousOccurrence(s.last_paid_date, s.interval);
          const { upcoming, overdue } = computeSubscriptionStatus(s.first_due_date, s.interval, lastPaidDate, todayKey());
          return { ...s, last_paid_date: lastPaidDate, upcoming_due_date: upcoming, overdue_due_date: overdue };
        }),
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) qc.setQueryData(['subscriptions'], context.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['subscriptions'] }),
  });
}
