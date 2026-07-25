import { api } from './client';

/** A tag as embedded on a transaction (GET /transactions returns these inline). */
export type Tag = { id: number; name: string; user_id: number };

export type TxnType = 'debit' | 'credit';

/** One transaction — matches backend TransactionItem / TransactionOut. */
export type Transaction = {
  id: number;
  txn_date: string; // ISO datetime
  description: string;
  amount: number;
  type: TxnType;
  source: string;
  account_id: number;
  category_id: number | null;
  merchant_id: number | null;
  upi_ref: string | null;
  unique_key?: string | null;
  tags: Tag[];
};

/** Paginated response shape of GET /transactions (backend TransactionLogOut). */
export type TransactionPage = {
  total_count: number;
  page: number;
  limit: number;
  transactions: Transaction[];
};

/** Server-side filters accepted by GET /transactions. */
export type TxnFilters = {
  account_id?: number;
  category_id?: number;
  start_date?: string; // YYYY-MM-DD (inclusive)
  end_date?: string; // YYYY-MM-DD (inclusive)
  type?: TxnType;
  search_term?: string;
};

/** GET /transactions — one page of transactions matching `filters`. */
export async function getTransactions(
  params: { page: number; limit: number } & TxnFilters,
): Promise<TransactionPage> {
  const { data } = await api.get<TransactionPage>('/transactions', { params });
  return data;
}

/** Body for creating/updating a transaction. Tags attach inline via `tag_ids`. */
export type TransactionInput = {
  txn_date: string; // ISO datetime (midnight UTC of the picked day — see monthRange)
  description: string;
  amount: number;
  type: TxnType;
  source: string; // 'Manual' for app-created transactions
  account_id: number;
  category_id?: number | null;
  upi_ref?: string | null;
  tag_ids?: number[];
};

/** POST /transactions — create a manual transaction. */
export async function createTransaction(body: TransactionInput): Promise<Transaction> {
  const { data } = await api.post<Transaction>('/transactions', body);
  return data;
}

/** PUT /transactions/{id} — full update. `tag_ids` replaces the tag set. */
export async function updateTransaction(
  id: number,
  body: Partial<TransactionInput>,
): Promise<Transaction> {
  const { data } = await api.put<Transaction>(`/transactions/${id}`, body);
  return data;
}

/** DELETE /transactions/{id}. */
export async function deleteTransaction(id: number): Promise<void> {
  await api.delete(`/transactions/${id}`);
}
