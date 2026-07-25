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
