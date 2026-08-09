import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, View } from 'react-native';

import { useTheme } from '@/theme';
import { AppText } from '../ui/AppText';
import { Surface } from '../ui/Surface';

/** Human wording for each tool, so the wait says something useful. */
const TOOL_LABELS: Record<string, string> = {
  get_month_summary: 'Checking your month',
  get_budget_status: 'Checking your budgets',
  get_spending_analytics: 'Looking at your trends',
  search_transactions: 'Searching transactions',
  list_categories: 'Reading your categories',
  list_accounts: 'Reading your accounts',
  list_tags: 'Reading your tags',
};

/**
 * The waiting state. This is load-bearing rather than decoration: first-token
 * latency from the model measured 20-40s and tool-answering questions took up
 * to 77s end to end, so a bare spinner would read as a hung app. The backend
 * emits `status` and `tool` events precisely so this line can say what is
 * actually happening, and the copy escalates once the wait gets long enough to
 * be the backend cold-starting (Render idles the service after ~15 minutes).
 */
export function StatusLine({
  phase,
  activeTool,
  onFallback,
}: {
  phase: 'waiting' | 'thinking' | 'tool';
  activeTool: string | null;
  onFallback?: boolean;
}) {
  const t = useTheme();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const started = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  let label = 'Thinking';
  if (phase === 'tool' && activeTool) label = TOOL_LABELS[activeTool] ?? 'Looking that up';
  else if (phase === 'waiting' && elapsed >= 6) label = 'Waking up the server';
  // The backup provider measured ~100s to first token, so name it explicitly.
  // "Still thinking" for a minute and a half reads as a hang; "using the backup,
  // this one's slow" reads as a system behaving as designed.
  if (onFallback) label = 'Primary is busy — using the backup, this is slower';

  return (
    <View style={{ alignSelf: 'flex-start', maxWidth: '92%' }}>
      <Surface
        backgroundColor={t.colors.card}
        offset={t.shadowOffset.chip}
        radius={t.radius.card}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: t.spacing.sm,
          paddingHorizontal: t.spacing.lg,
          paddingVertical: t.spacing.md,
        }}
      >
        <Dots />
        <AppText variant="body" tone="muted">
          {label}
          {elapsed >= 10 ? ` · ${elapsed}s` : ''}
        </AppText>
      </Surface>
    </View>
  );
}

/** Three ink dots pulsing in sequence. */
function Dots() {
  const t = useTheme();
  const values = useRef([0, 1, 2].map(() => new Animated.Value(0.3))).current;

  useEffect(() => {
    const loops = values.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 160),
          Animated.timing(v, {
            toValue: 1,
            duration: 320,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(v, {
            toValue: 0.3,
            duration: 320,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.delay((2 - i) * 160),
        ]),
      ),
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [values]);

  return (
    <View style={{ flexDirection: 'row', gap: 3 }}>
      {values.map((v, i) => (
        <Animated.View
          key={i}
          style={{
            width: 5,
            height: 5,
            borderRadius: 999,
            backgroundColor: t.colors.muted,
            opacity: v,
          }}
        />
      ))}
    </View>
  );
}
