import AsyncStorage from '@react-native-async-storage/async-storage';

import type { NavigateAction } from '@/lib/assistantActions';

/**
 * Chat history persistence.
 *
 * History is client-side only — there is no assistant table on the backend, and
 * the request carries the transcript each turn. Storage is AsyncStorage rather
 * than SecureStore: the content is spending detail that react-query already
 * caches in the same place, so this adds no exposure SecureStore would prevent,
 * and SecureStore is size-limited in a way a transcript would eventually hit.
 *
 * Keyed per user so switching accounts on one device never shows the previous
 * user's conversation. `clearAllHistory` runs on sign-out alongside qc.clear().
 */

export type ChatRole = 'user' | 'assistant';

export type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  /** Present on assistant turns that ended with a valid navigate action. */
  action?: NavigateAction;
  /** Set when the turn failed; the bubble renders as an error with Retry. */
  error?: string;
};

const KEY_PREFIX = 'pft.assistant.history.';
/** Keep the tail only — long transcripts cost tokens and storage for little gain. */
const MAX_STORED = 50;

function keyFor(userId: number | string): string {
  return `${KEY_PREFIX}${userId}`;
}

export async function loadHistory(userId: number | string): Promise<ChatMessage[]> {
  try {
    const raw = await AsyncStorage.getItem(keyFor(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ChatMessage[]) : [];
  } catch {
    // Corrupt history should start an empty chat, never crash the screen.
    return [];
  }
}

export async function saveHistory(
  userId: number | string,
  messages: ChatMessage[],
): Promise<void> {
  try {
    // Don't persist a failed turn — it would reload as a dead bubble whose
    // Retry has no pending request behind it.
    const keep = messages.filter((m) => !m.error).slice(-MAX_STORED);
    await AsyncStorage.setItem(keyFor(userId), JSON.stringify(keep));
  } catch {
    // Persistence is best-effort; the in-memory conversation still works.
  }
}

export async function clearHistory(userId: number | string): Promise<void> {
  try {
    await AsyncStorage.removeItem(keyFor(userId));
  } catch {
    // ignore
  }
}

/** Wipe every user's transcript — used on sign-out. */
export async function clearAllHistory(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const ours = keys.filter((k) => k.startsWith(KEY_PREFIX));
    if (ours.length) await AsyncStorage.multiRemove(ours);
  } catch {
    // ignore
  }
}
