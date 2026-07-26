import { useMutation, useQueryClient } from '@tanstack/react-query';

import { uploadStatements, type StatementFile } from '@/api/uploads';

/**
 * Uploads bank statements and refreshes everything derived from transactions.
 *
 * An import writes an unknown number of rows across an unknown span of months,
 * so there's no single month key to target — every month-scoped cache is
 * invalidated wholesale (CONVENTIONS §7). Tags come along because the importer's
 * categorisation step can create new ones.
 */
export function useUploadStatements() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (files: StatementFile[]) => uploadStatements(files),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });
}
