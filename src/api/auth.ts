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
