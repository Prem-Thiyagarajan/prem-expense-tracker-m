import { isAxiosError } from 'axios';
import { fetch } from 'expo/fetch';

import { env } from '@/lib/env';
import { api, notifyUnauthorized } from './client';
import { getToken } from './tokenStore';

/**
 * Assistant transport — deliberately split across two HTTP clients.
 *
 * CHAT uses `expo/fetch`, because axios cannot read a response body
 * incrementally in React Native and a streamed reply would only appear once the
 * model had finished. The cost is that no axios interceptor applies, so the
 * Authorization header and 401 handling are done by hand in `streamChat`.
 *
 * EVERYTHING ELSE uses the shared axios client. In particular TRANSCRIBE must
 * not use `expo/fetch`: it uploads a recording as a React Native FormData part
 * of the form `{ uri, name, type }`, and expo/fetch cannot serialize that —
 * expo's own `convertFormData.d.ts` states "`uri` is not supported for React
 * Native's FormData". It threw before any HTTP status existed, which surfaced
 * to the user as a bogus "check your connection". Axios goes through XHR, which
 * handles file URIs natively, and brings auth + 401 handling with it.
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

/**
 * POST an audio clip for transcription. Distinguishes "busy" from "down".
 *
 * Goes through axios (XHR) rather than expo/fetch: only XHR understands React
 * Native's `{ uri, name, type }` FormData part. See the note at the top.
 */
export async function transcribeAudio(uri: string): Promise<string> {
  const form = new FormData();
  form.append('file', {
    uri,
    name: 'recording.m4a',
    type: 'audio/m4a',
  } as unknown as Blob);

  try {
    const { data } = await api.post<{ text?: string }>('/assistant/transcribe', form, {
      // Let axios/XHR generate the multipart boundary; setting the header
      // without one produces a body the server cannot parse.
      headers: { 'Content-Type': 'multipart/form-data' },
      // Whisper on a 60s clip plus upload over mobile data needs longer than
      // the client's default.
      timeout: 90_000,
    });
    return (data.text ?? '').trim();
  } catch (e) {
    // 401 is already handled by the axios interceptor; everything else is
    // mapped to the backend's error taxonomy so the UI can tell "busy" (retry
    // in a moment, mic stays enabled) from "unavailable" (mic disables).
    let code = 'voice_unavailable';
    let message = 'Voice input is temporarily unavailable — you can still type.';
    let status: number | undefined;

    if (isAxiosError(e)) {
      status = e.response?.status;
      const detail = (e.response?.data as { detail?: { code?: string; message?: string } })?.detail;
      if (detail?.code) code = detail.code;
      if (detail?.message) message = detail.message;
      else if (!e.response) {
        code = 'network';
        message = 'Could not reach the server. Check your connection.';
      }
    }
    throw new AssistantRequestError(message, code, status);
  }
}

/**
 * Capability probe. Chat and voice are reported separately so a provider
 * outage can disable just the microphone while text chat keeps working.
 */
export async function getAssistantHealth(): Promise<AssistantHealth> {
  try {
    const { data } = await api.get<AssistantHealth>('/assistant/health');
    return data;
  } catch {
    // Treat an unreachable probe as "chat may work, voice definitely unproven".
    return { chat: true, voice: false, voice_reason: 'probe_failed' };
  }
}
