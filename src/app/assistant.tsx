import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChatBubble } from '@/components/assistant/ChatBubble';
import { Composer } from '@/components/assistant/Composer';
import { StatusLine } from '@/components/assistant/StatusLine';
import { SuggestionChips } from '@/components/assistant/SuggestionChips';
import { ChevronLeftIcon } from '@/components/icons';
import { AppText } from '@/components/ui/AppText';
import { Surface } from '@/components/ui/Surface';
import { useAssistant } from '@/hooks/useAssistant';
import { currentMonth } from '@/lib/month';
import { useTheme } from '@/theme';

/**
 * Assistant chat screen.
 *
 * Root-level route rather than a tab: the tab bar already carries four tabs
 * plus the centre Add FAB, and its canopy is hand-cut SVG geometry that a fifth
 * item would require re-deriving.
 *
 * The month arrives as a route param because MonthProvider is mounted inside
 * `(tabs)/_layout`, so `useMonth()` is unavailable here. Entry points inside the
 * tabs pass the month they are showing; anywhere else falls back to today.
 */
export default function AssistantScreen() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ month?: string; q?: string }>();

  const month = useMemo(
    () => (params.month && /^\d{4}-\d{2}$/.test(params.month) ? params.month : currentMonth()),
    [params.month],
  );

  const {
    messages,
    streamingText,
    phase,
    activeTool,
    onFallback,
    hydrated,
    isBusy,
    chatAvailable,
    send,
    retry,
    stop,
    clear,
  } = useAssistant(month);

  const [draft, setDraft] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  const seededRef = useRef(false);

  // A contextual entry point (e.g. the budget card's "?") can pre-seed a
  // question. Fire it once, after hydration, so it lands under any history.
  useEffect(() => {
    if (!hydrated || seededRef.current || !params.q) return;
    seededRef.current = true;
    send(String(params.q));
  }, [hydrated, params.q, send]);

  // Keep the newest turn in view as tokens arrive.
  useEffect(() => {
    const id = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
    return () => clearTimeout(id);
  }, [messages.length, streamingText, phase]);

  const isEmpty = messages.length === 0;
  const waiting = phase === 'waiting' || phase === 'thinking' || phase === 'tool';

  const submit = (text: string) => {
    send(text);
    setDraft('');
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: t.spacing.sm,
            paddingTop: insets.top + t.spacing.sm,
            paddingHorizontal: t.spacing.lg,
            paddingBottom: t.spacing.md,
          }}
        >
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <ChevronLeftIcon size={24} color={t.colors.ink} />
          </Pressable>
          <AppText variant="title" style={{ flex: 1 }}>
            Ask
          </AppText>
          {!isEmpty ? (
            <Pressable onPress={clear} hitSlop={8} disabled={isBusy}>
              <AppText variant="bodySemi" tone={isBusy ? 'faint' : 'muted'} style={{ fontSize: 13 }}>
                Clear
              </AppText>
            </Pressable>
          ) : null}
        </View>

        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: t.spacing.lg,
            paddingBottom: t.spacing.lg,
            gap: t.spacing.md,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {isEmpty && hydrated ? (
            <View style={{ gap: t.spacing.xl, paddingTop: t.spacing.md }}>
              <Surface
                backgroundColor={t.candy.lilac}
                offset={t.shadowOffset.card}
                radius={t.radius.cardLg}
                style={{ padding: t.spacing.lg }}
              >
                <AppText variant="heading" color={t.candyText}>
                  Ask me about your money ✨
                </AppText>
                <AppText variant="body" color={t.candyText} style={{ marginTop: 6 }}>
                  I can read your spending, budgets and categories, and point you to the right
                  screen. I can&apos;t change anything myself.
                </AppText>
              </Surface>
              <SuggestionChips onPick={submit} />
            </View>
          ) : null}

          {messages.map((m, i) => {
            const isLast = i === messages.length - 1;
            return (
              <ChatBubble
                key={m.id}
                message={m}
                onRetry={isLast && m.error ? retry : undefined}
              />
            );
          })}

          {/* Live bubble: only once the first token lands, so it never shows empty. */}
          {phase === 'streaming' ? (
            <ChatBubble
              message={{ id: 'live', role: 'assistant', text: '' }}
              streamingText={streamingText}
            />
          ) : null}

          {waiting ? (
            <StatusLine phase={phase} activeTool={activeTool} onFallback={onFallback} />
          ) : null}
        </ScrollView>

        <View
          style={{
            paddingHorizontal: t.spacing.lg,
            paddingTop: t.spacing.sm,
            paddingBottom: Math.max(insets.bottom, t.spacing.md),
            borderTopWidth: t.border.row,
            borderTopColor: t.colors.hair,
            backgroundColor: t.colors.bg,
          }}
        >
          <Composer
            value={draft}
            onChangeText={setDraft}
            onSend={submit}
            onStop={stop}
            isBusy={isBusy}
            disabled={!chatAvailable}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
