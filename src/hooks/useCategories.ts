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

/** Any category write invalidates the shared list so every screen re-reads it. */
export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CategoryCreate) => createCategory(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: CategoryUpdate }) => updateCategory(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteCategory(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
}
