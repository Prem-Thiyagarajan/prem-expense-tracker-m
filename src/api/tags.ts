import { api } from './client';
import type { Tag } from './transactions';

/** GET /tags — all of the user's tags. */
export async function getTags(): Promise<Tag[]> {
  const { data } = await api.get<Tag[]>('/tags');
  return data;
}

/** POST /tags — create a tag by name, returning it (with its new id). */
export async function createTag(name: string): Promise<Tag> {
  const { data } = await api.post<Tag>('/tags', { name });
  return data;
}

/** PUT /tags/{id} — rename a tag. */
export async function updateTag(id: number, name: string): Promise<Tag> {
  const { data } = await api.put<Tag>(`/tags/${id}`, { name });
  return data;
}

/** DELETE /tags/{id} — remove a tag (detaches it from any transactions). */
export async function deleteTag(id: number): Promise<void> {
  await api.delete(`/tags/${id}`);
}
