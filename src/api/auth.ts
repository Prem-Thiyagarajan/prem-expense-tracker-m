import { api } from './client';
import { clearToken, setToken } from './tokenStore';

export type AuthUser = { id: number; username: string; email: string };
export type LoginInput = { identifier: string; password: string; remember_me: boolean };
export type RegisterInput = { username: string; email: string; password: string };

/** POST /auth/register — creates a user; returns no token (user logs in after). */
export async function registerRequest(input: RegisterInput): Promise<AuthUser> {
  const { data } = await api.post<AuthUser>('/auth/register', input);
  return data;
}

/** POST /auth/login — stores the JWT in secure storage on success. */
export async function loginRequest(input: LoginInput): Promise<void> {
  const { data } = await api.post<{ access_token: string; token_type: string }>('/auth/login', input);
  await setToken(data.access_token);
}

/** GET /users/me — the authenticated user's profile. */
export async function getMe(): Promise<AuthUser> {
  const { data } = await api.get<AuthUser>('/users/me');
  return data;
}

export async function logoutRequest(): Promise<void> {
  await clearToken();
}

export type RecoveryResetInput = { identifier: string; answer: string; new_password: string };

/**
 * POST /auth/recovery/question — the security question for an account.
 * 404 if the account has no security question set.
 */
export async function getRecoveryQuestion(identifier: string): Promise<string> {
  const { data } = await api.post<{ question: string }>('/auth/recovery/question', { identifier });
  return data.question;
}

/** POST /auth/recovery/reset — set a new password after verifying the security answer. */
export async function resetPasswordWithAnswer(input: RecoveryResetInput): Promise<void> {
  await api.post('/auth/recovery/reset', input);
}

export type SecurityQuestionInput = {
  current_password: string;
  question: string;
  answer: string;
};

/**
 * POST /auth/security-question — set or replace the account-recovery question
 * that `getRecoveryQuestion` later serves to the forgot-password flow.
 *
 * The current password is required by the backend so a stolen session token
 * alone can't seed a recovery answer and take the account over. Answers are
 * stored `strip().lower()`-normalised, so case and stray spaces don't matter
 * when the answer is checked later.
 */
export async function setSecurityQuestion(input: SecurityQuestionInput): Promise<void> {
  await api.post('/auth/security-question', input);
}

export type ChangePasswordInput = { old_password: string; new_password: string };

/** POST /auth/change-password — change the signed-in user's password. */
export async function changePassword(input: ChangePasswordInput): Promise<void> {
  await api.post('/auth/change-password', input);
}

/**
 * DELETE /users/me — permanently delete the signed-in account. The current
 * password is re-verified server-side, so it travels in the request body.
 */
export async function deleteMyAccount(password: string): Promise<void> {
  await api.delete('/users/me', { data: { password } });
}
