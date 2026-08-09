import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  AssistantRequestError,
  getAssistantHealth,
  streamChat,
  type ChatTurn,
} from '@/api/assistant';
import { useAuth } from '@/auth/AuthProvider';
import { parseNavigateAction } from '@/lib/assistantActions';
import { loadHistory, saveHistory, type ChatMessage } from '@/state/assistantStore';

/** Turns of history replayed to the model. Bounded to keep requests cheap. */
const HISTORY_TURNS = 20;

let idCounter = 0;
const nextId = () => `m${Date.now()}_${idCounter++}`;

/**
 * Owns the conversation: message list, streaming lifecycle, persistence and the
 * capability probe.
 *
 * Streaming state lives in a ref-backed "live" message rather than in the
 * persisted list, so a token arriving every few milliseconds re-renders one
 * bubble instead of rewriting the whole transcript.
 */
export function useAssistant(month: string | null) {
  const { user } = useAuth();
  const userId = user?.id;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streamingText, setStreamingText] = useState('');
  const [phase, setPhase] = useState<'idle' | 'waiting' | 'thinking' | 'tool' | 'streaming'>('idle');
  const [activeTool, setActiveTool] = useState<string | null>(null);
  /** True once this turn has dropped to the slow backup provider. */
  const [onFallback, setOnFallback] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  messagesRef.current = messages;

  /**
   * Capability probe. `chat` and `voice` are independent, so a voice outage
   * disables only the microphone — see the backend's assistant_router.
   */
  const health = useQuery({
    queryKey: ['assistant', 'health'],
    queryFn: getAssistantHealth,
    staleTime: 60_000,
    retry: 1,
  });

  // Hydrate this user's transcript once.
  useEffect(() => {
    let cancelled = false;
    if (userId == null) {
      setHydrated(true);
      return;
    }
    loadHistory(userId).then((stored) => {
      if (!cancelled) {
        setMessages(stored);
        setHydrated(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Persist on change, but only after hydration — otherwise the initial empty
  // state would overwrite the stored transcript before it had loaded.
  useEffect(() => {
    if (hydrated && userId != null) void saveHistory(userId, messages);
  }, [messages, hydrated, userId]);

  // Abort any in-flight stream if the screen goes away mid-answer.
  useEffect(() => () => abortRef.current?.abort(), []);

  const runTurn = useCallback(
    async (history: ChatMessage[], question: string) => {
      const controller = new AbortController();
      abortRef.current = controller;

      setPhase('waiting');
      setActiveTool(null);
      setStreamingText('');
      setOnFallback(false);

      const turns: ChatTurn[] = [...history, { id: '', role: 'user' as const, text: question }]
        .filter((m) => !m.error && m.text.trim())
        .slice(-HISTORY_TURNS)
        .map((m) => ({ role: m.role, content: m.text }));

      let text = '';
      let action: ChatMessage['action'];
      let failure: string | null = null;

      try {
        for await (const event of streamChat(turns, month, controller.signal)) {
          switch (event.type) {
            case 'status':
              if (event.state === 'fallback') setOnFallback(true);
              else setPhase('thinking');
              break;
            case 'tool':
              setPhase('tool');
              setActiveTool(event.name);
              break;
            case 'delta':
              text += event.text;
              setPhase('streaming');
              setStreamingText(text);
              break;
            case 'navigate': {
              const parsed = parseNavigateAction(event);
              if (parsed) action = parsed;
              break;
            }
            case 'error':
              failure = event.message;
              break;
            case 'done':
              break;
          }
        }
      } catch (e) {
        // A user-pressed stop is not a failure — keep whatever streamed in.
        if (controller.signal.aborted) {
          failure = null;
        } else if (e instanceof AssistantRequestError) {
          failure = e.message;
        } else {
          failure = 'Could not reach the assistant. Check your connection.';
        }
      }

      abortRef.current = null;
      setPhase('idle');
      setActiveTool(null);
      setStreamingText('');

      const trimmed = text.trim();
      if (!trimmed && failure) {
        setMessages((prev) => [
          ...prev,
          { id: nextId(), role: 'assistant', text: '', error: failure },
        ]);
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: nextId(),
          role: 'assistant',
          text: trimmed || 'I did not get a reply. Please try again.',
          action,
          // A failure after partial text is worth surfacing, but the text stays.
          error: failure ?? undefined,
        },
      ]);
    },
    [month],
  );

  const send = useCallback(
    (raw: string) => {
      const question = raw.trim();
      if (!question || phase !== 'idle') return;

      const history = messagesRef.current;
      const userMessage: ChatMessage = { id: nextId(), role: 'user', text: question };
      setMessages([...history, userMessage]);
      void runTurn(history, question);
    },
    [phase, runTurn],
  );

  /** Re-run the last question, dropping the failed reply. */
  const retry = useCallback(() => {
    if (phase !== 'idle') return;
    const history = messagesRef.current;
    // Walk back past the failed assistant turn to the question that caused it.
    const lastUser = [...history].reverse().find((m) => m.role === 'user');
    if (!lastUser) return;
    const upTo = history.slice(0, history.lastIndexOf(lastUser) + 1);
    setMessages(upTo);
    void runTurn(upTo.slice(0, -1), lastUser.text);
  }, [phase, runTurn]);

  const stop = useCallback(() => abortRef.current?.abort(), []);

  const clear = useCallback(() => setMessages([]), []);

  return {
    messages,
    streamingText,
    phase,
    activeTool,
    onFallback,
    hydrated,
    isBusy: phase !== 'idle',
    chatAvailable: health.data?.chat ?? true,
    voiceAvailable: health.data?.voice ?? false,
    voiceReason: health.data?.voice_reason ?? null,
    refetchHealth: health.refetch,
    send,
    retry,
    stop,
    clear,
  };
}
