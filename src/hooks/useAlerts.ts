import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { acknowledgeAlert, getUnreadAlerts, type Alert } from '@/api/alerts';

/**
 * Unread alerts (budget-threshold + new-category), for the bell badge and its
 * list. Polled rather than month-keyed — alerts aren't tied to the app-wide
 * month switcher, and a 60s refetch is enough to feel live without hammering
 * the backend on every screen focus.
 */
export function useUnreadAlerts() {
  return useQuery({
    queryKey: ['alerts', 'unread'],
    queryFn: getUnreadAlerts,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}

/**
 * Marks one alert as read. Removes it from the unread list immediately
 * (matching the web app's optimistic dismiss) rather than waiting on the
 * round trip — the badge/list should react the instant you tap, not after a
 * network delay. Rolled back if the request actually fails.
 */
export function useAcknowledgeAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => acknowledgeAlert(id),
    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey: ['alerts', 'unread'] });
      const previous = queryClient.getQueryData<Alert[]>(['alerts', 'unread']);
      queryClient.setQueryData<Alert[]>(['alerts', 'unread'], (old) =>
        (old ?? []).filter((a) => a.id !== id),
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) queryClient.setQueryData(['alerts', 'unread'], context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
}
