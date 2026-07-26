import { useMutation } from '@tanstack/react-query';

import {
  changePassword,
  deleteMyAccount,
  setSecurityQuestion,
  type ChangePasswordInput,
  type SecurityQuestionInput,
} from '@/api/auth';

/** POST /auth/change-password — no cached data to touch, so no invalidation. */
export function useChangePassword() {
  return useMutation({
    mutationFn: (input: ChangePasswordInput) => changePassword(input),
  });
}

/** POST /auth/security-question — nothing cached reads it, so no invalidation. */
export function useSetSecurityQuestion() {
  return useMutation({
    mutationFn: (input: SecurityQuestionInput) => setSecurityQuestion(input),
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
