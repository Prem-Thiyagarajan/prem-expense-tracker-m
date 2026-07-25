import { useMutation } from '@tanstack/react-query';

import { changePassword, deleteMyAccount, type ChangePasswordInput } from '@/api/auth';

/** POST /auth/change-password — no cached data to touch, so no invalidation. */
export function useChangePassword() {
  return useMutation({
    mutationFn: (input: ChangePasswordInput) => changePassword(input),
  });
}

/**
 * DELETE /users/me. The caller handles the aftermath (sign out + clear the
 * query cache) since the whole session is gone once this resolves.
 */
export function useDeleteMyAccount() {
  return useMutation({
    mutationFn: (password: string) => deleteMyAccount(password),
  });
}
