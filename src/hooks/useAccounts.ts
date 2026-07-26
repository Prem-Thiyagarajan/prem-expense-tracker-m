import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createAccount,
  deleteAccount,
  getAccounts,
  updateAccount,
  type AccountCreate,
  type AccountUpdate,
} from '@/api/accounts';

/** The user's bank accounts — a slow-changing lookup for row labels + Add. */
export function useAccounts() {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: getAccounts,
    staleTime: 10 * 60_000,
  });
}

/**
 * Any account write invalidates the shared list so every screen re-reads it.
 *
 * `onSettled` rather than `onSuccess`: a rejected write usually means the cached
 * list no longer matches the server (a 404 on delete says the row isn't there,
 * or isn't yours), so that's exactly when a refetch is most needed. Only
 * re-syncing on success leaves the stale row sitting on screen next to an error
 * telling you it doesn't exist.
 */
export function useCreateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AccountCreate) => createAccount(input),
    onSettled: () => qc.invalidateQueries({ queryKey: ['accounts'] }),
  });
}

export function useUpdateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: AccountUpdate }) => updateAccount(id, input),
    onSettled: () => qc.invalidateQueries({ queryKey: ['accounts'] }),
  });
}

export function useDeleteAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteAccount(id),
    onSettled: () => qc.invalidateQueries({ queryKey: ['accounts'] }),
  });
}
