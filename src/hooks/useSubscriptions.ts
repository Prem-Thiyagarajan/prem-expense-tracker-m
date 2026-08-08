import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createSubscription,
  deleteSubscription,
  getSubscriptions,
  markSubscriptionPaid,
  updateSubscription,
  type SubscriptionCreate,
  type SubscriptionUpdate,
} from '@/api/subscriptions';

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

/** Confirms a cycle paid — the "Mark as paid" button, and Bill Radar's auto-match. */
export function useMarkSubscriptionPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, paidForDate }: { id: number; paidForDate?: string }) =>
      markSubscriptionPaid(id, paidForDate),
    onSettled: () => qc.invalidateQueries({ queryKey: ['subscriptions'] }),
  });
}
