import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { createTag, deleteTag, getTags, updateTag } from '@/api/tags';

/** The user's tags — a slow-changing lookup for the Add sheet's tag picker. */
export function useTags() {
  return useQuery({
    queryKey: ['tags'],
    queryFn: getTags,
    staleTime: 10 * 60_000,
  });
}

/**
 * Any tag write invalidates the shared list so every screen re-reads it.
 * `onSettled` rather than `onSuccess` — see `useAccounts` for why a *failed*
 * write is precisely when the cached list needs re-syncing.
 */
export function useCreateTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => createTag(name),
    onSettled: () => qc.invalidateQueries({ queryKey: ['tags'] }),
  });
}

export function useUpdateTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => updateTag(id, name),
    onSettled: () => qc.invalidateQueries({ queryKey: ['tags'] }),
  });
}

export function useDeleteTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteTag(id),
    onSettled: () => qc.invalidateQueries({ queryKey: ['tags'] }),
  });
}
