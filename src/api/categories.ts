import { api } from './client';

/** Response shape of GET /categories (see backend category_schema.py CategoryOut). */
export type Category = {
  id: number;
  name: string;
  is_income: boolean;
  icon_name: string | null;
  user_id: number;
};

/** GET /categories — every category owned by the current user. */
export async function getCategories(): Promise<Category[]> {
  const { data } = await api.get<Category[]>('/categories');
  return data;
}
