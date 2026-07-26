import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createCategory,
  deleteCategory,
  getCategories,
  updateCategory,
  type CategoryCreate,
  type CategoryUpdate,
} from '@/api/categories';

/**
 * The user's categories — a slow-changing lookup shared across Expenses, Add,
 * and Budget. Cached 10m (CONVENTIONS §7); rows are joined to transactions
 * client-side.
 */
export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
    staleTime: 10 * 60_000,
  });
}

/**
 * Any category write invalidates the shared list so every screen re-reads it.
 * `onSettled` rather than `onSuccess` — see `useAccounts` for why a *failed*
 * write is precisely when the cached list needs re-syncing.
 */
export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CategoryCreate) => createCategory(input),
    onSettled: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: CategoryUpdate }) => updateCategory(id, input),
    onSettled: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteCategory(id),
    onSettled: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
}
