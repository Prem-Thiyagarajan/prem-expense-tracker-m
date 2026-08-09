import { fetch } from 'expo/fetch';

import { env } from '@/lib/env';
import { notifyUnauthorized } from './client';
import { getToken } from './tokenStore';

/**
 * Assistant transport.
 *
 * ── Why this file does not use the shared axios client ──────────────────────
 * Axios cannot read a response body incrementally in React Native — it buffers
 * the whole thing — so a streamed reply would only appear once the model had
 * finished, defeating the point. `expo/fetch` exposes a real ReadableStream, so
 * chat goes through that instead.
 *
 * The cost is that NONE of the axios interceptors apply here: no automatic
 * Authorization header and no 401 handling. Both are done by hand below. Forget
 * either and you get the failure mode documented in lib/env.ts — a dead session
 * that silently never recovers.
 */

/** One event off the SSE stream. Mirrors the backend's assistant_router. */
export type AssistantEvent =
  // 'fallback' means the fast provider was unavailable and the slower backup is
  // serving this reply — it can take ~100s, so the UI says so rather than
  // leaving the user staring at a spinner.
  | { type: 'status'; state: 'thinking' | 'fallback' }
  | { type: 'delta'; text: string }
  | { type: 'tool'; name: string }
  | { type: 'navigate'; route: string; open?: string; label: string }
  | { type: 'error'; code: string; message: string }
  | { type: 'done' };

export type ChatTurn = { role: 'user' | 'assistant'; content: string };

export type AssistantHealth = {
  chat: boolean;
  voice: boolean;
  voice_reason: string | null;
};

/** Thrown when the request never got off the ground (no stream was opened). */
export class AssistantRequestError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status?: number,
  ) {
    super(message);
  }
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Shared 401 handling, since the axios interceptor doesn't cover these calls. */
async function guardAuth(status: number) {
  if (status === 401) {
    await notifyUnauthorized();
    throw new AssistantRequestError('Your session expired. Please sign in again.', 'unauthorized', 401);
  }
}

/**
 * Stream a reply. Yields events as they arrive; the caller decides what to
 * render. Pass `signal` to support the composer's stop button.
 */
export async function* streamChat(
  messages: ChatTurn[],
  month: string | null,
  signal?: AbortSignal,
): AsyncGenerator<AssistantEvent> {
  const response = await fetch(`${env.apiBaseUrl}/assistant/chat`, {
    method: 'POST',
    headers: {
      ...(await authHeaders()),
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify({ messages, month }),
    signal,
  });

  await guardAuth(response.status);

  if (!response.ok) {
    // 429 from our own rate limiter, 503 when the chat provider isn't configured.
    const code = response.status === 429 ? 'rate_limited' : 'chat_unavailable';
    const message =
      response.status === 429
        ? 'You are sending messages a bit fast — give it a moment.'
        : 'The assistant is unavailable right now. Please try again shortly.';
    throw new AssistantRequestError(message, code, response.status);
  }

  const body = response.body;
  if (!body) {
    throw new AssistantRequestError('No response from the assistant.', 'empty_stream');
  }

  const reader = body.getReader();
  const decoder = new TextDecoder();
  // SSE frames are separated by a blank line, and a frame can straddle chunk
  // boundaries — so hold a buffer and only consume complete frames.
  let buffer = '';

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      let split = buffer.indexOf('\n\n');
      while (split !== -1) {
        const frame = buffer.slice(0, split);
        buffer = buffer.slice(split + 2);
        const payload = frame
          .split('\n')
          .filter((line) => line.startsWith('data:'))
          .map((line) => line.slice(5).trim())
          .join('');
        if (payload) {
          try {
            yield JSON.parse(payload) as AssistantEvent;
          } catch {
            // A malformed frame shouldn't kill an otherwise good stream.
          }
        }
        split = buffer.indexOf('\n\n');
      }
    }
  } finally {
    reader.cancel().catch(() => {});
  }
}

/** POST an audio clip for transcription. Distinguishes "busy" from "down". */
export async function transcribeAudio(uri: string): Promise<string> {
  const form = new FormData();
  // RN's FormData takes this {uri, name, type} shape for file parts.
  form.append('file', {
    uri,
    name: 'recording.m4a',
    type: 'audio/m4a',
  } as unknown as Blob);

  const response = await fetch(`${env.apiBaseUrl}/assistant/transcribe`, {
    method: 'POST',
    headers: await authHeaders(), // no Content-Type — the boundary must be auto-set
    body: form,
  });

  await guardAuth(response.status);

  if (!response.ok) {
    let code = 'voice_unavailable';
    let message = 'Voice input is temporarily unavailable — you can still type.';
    try {
      const detail = (await response.json())?.detail;
      if (detail?.code) code = detail.code;
      if (detail?.message) message = detail.message;
    } catch {
      // Keep the defaults if the body isn't the JSON we expect.
    }
    throw new AssistantRequestError(message, code, response.status);
  }

  const data = (await response.json()) as { text?: string };
  return (data.text ?? '').trim();
}

/**
 * Capability probe. Chat and voice are reported separately so a provider
 * outage can disable just the microphone while text chat keeps working.
 */
export async function getAssistantHealth(): Promise<AssistantHealth> {
  const response = await fetch(`${env.apiBaseUrl}/assistant/health`, {
    headers: await authHeaders(),
  });

  await guardAuth(response.status);

  if (!response.ok) {
    // Treat an unreachable probe as "chat may work, voice definitely unproven".
    return { chat: true, voice: false, voice_reason: 'probe_failed' };
  }
  return (await response.json()) as AssistantHealth;
}
