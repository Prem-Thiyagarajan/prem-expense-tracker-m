import { useMutation, useQueryClient } from '@tanstack/react-query';

import { invalidateTransactionDerived } from '@/api/queryClient';
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
      invalidateTransactionDerived(queryClient);
      // Tags too: the importer's categorisation step can create new ones.
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });
}
