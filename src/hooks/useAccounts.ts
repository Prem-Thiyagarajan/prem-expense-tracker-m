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

/** Any account write invalidates the shared list so every screen re-reads it. */
export function useCreateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AccountCreate) => createAccount(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts'] }),
  });
}

export function useUpdateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: AccountUpdate }) => updateAccount(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts'] }),
  });
}

export function useDeleteAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteAccount(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts'] }),
  });
}
