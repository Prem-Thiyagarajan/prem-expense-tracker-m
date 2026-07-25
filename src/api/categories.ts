import { api } from './client';

/** A spending category — matches backend CategoryOut. */
export type Category = {
  id: number;
  name: string;
  is_income: boolean;
  icon_name: string | null;
  user_id: number;
};

/** GET /categories — all of the user's categories. */
export async function getCategories(): Promise<Category[]> {
  const { data } = await api.get<Category[]>('/categories');
  return data;
}
