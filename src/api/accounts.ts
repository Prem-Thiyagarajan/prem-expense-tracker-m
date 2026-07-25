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

/** GET /accounts — all of the user's bank accounts. */
export async function getAccounts(): Promise<Account[]> {
  const { data } = await api.get<Account[]>('/accounts');
  return data;
}
