import { api } from './client';

/** A bank account — matches backend AccountOut. */
export type Account = {
  id: number;
  name: string;
  type: string;
  provider: string;
  account_number: string | null;
  user_id: number;
};

export type AccountCreate = { name: string; type: string; provider: string };
export type AccountUpdate = Partial<AccountCreate>;

/** GET /accounts — all of the user's bank accounts. */
export async function getAccounts(): Promise<Account[]> {
  const { data } = await api.get<Account[]>('/accounts');
  return data;
}

/** POST /accounts — create an account. */
export async function createAccount(input: AccountCreate): Promise<Account> {
  const { data } = await api.post<Account>('/accounts', input);
  return data;
}

/** PUT /accounts/{id} — update an account's name/type/provider. */
export async function updateAccount(id: number, input: AccountUpdate): Promise<Account> {
  const { data } = await api.put<Account>(`/accounts/${id}`, input);
  return data;
}

/** DELETE /accounts/{id} — remove an account (backend rejects if in use). */
export async function deleteAccount(id: number): Promise<void> {
  await api.delete(`/accounts/${id}`);
}
