import { api } from './client';

/** Response shape of GET /categories (see backend category_schema.py CategoryOut). */
export type Category = {
  id: number;
  name: string;
  is_income: boolean;
  icon_name: string | null;
  user_id: number;
};

export type CategoryCreate = { name: string; is_income: boolean; icon_name?: string | null };
export type CategoryUpdate = Partial<CategoryCreate>;

/** GET /categories — every category owned by the current user. */
export async function getCategories(): Promise<Category[]> {
  const { data } = await api.get<Category[]>('/categories');
  return data;
}

/** POST /categories — create a category. */
export async function createCategory(input: CategoryCreate): Promise<Category> {
  const { data } = await api.post<Category>('/categories', input);
  return data;
}

/** PUT /categories/{id} — update a category's name/type/icon. */
export async function updateCategory(id: number, input: CategoryUpdate): Promise<Category> {
  const { data } = await api.put<Category>(`/categories/${id}`, input);
  return data;
}

/** DELETE /categories/{id} — remove a category (backend rejects if in use). */
export async function deleteCategory(id: number): Promise<void> {
  await api.delete(`/categories/${id}`);
}
