import { View } from 'react-native';

import { useTheme } from '@/theme';
import { AppText } from '../ui/AppText';
import { PressableSurface } from '../ui/Surface';

/**
 * Empty-state prompts. A blank chat box gives no clue what this thing knows, so
 * these double as documentation — each one exercises a different tool, which is
 * also how a first-time user discovers the assistant is grounded in their real
 * data rather than being a generic chatbot.
 */
const SUGGESTIONS = [
  { emoji: '📊', text: 'How am I doing this month?' },
  { emoji: '🎯', text: 'Help me set up a budget' },
  { emoji: '🍕', text: 'Where did my Food money go?' },
  { emoji: '🔎', text: 'Show my biggest expenses' },
];

const TINTS = ['yellow', 'mint', 'pink', 'lilac'] as const;

export function SuggestionChips({ onPick }: { onPick: (text: string) => void }) {
  const t = useTheme();

  return (
    <View style={{ gap: t.spacing.md }}>
      <AppText variant="label">Try asking</AppText>
      <View style={{ gap: t.spacing.sm }}>
        {SUGGESTIONS.map((s, i) => (
          <PressableSurface
            key={s.text}
            onPress={() => onPick(s.text)}
            backgroundColor={t.candy[TINTS[i % TINTS.length]]}
            offset={t.shadowOffset.chip}
            radius={t.radius.chip}
            style={{ alignSelf: 'flex-start' }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: t.spacing.sm,
                paddingHorizontal: t.spacing.lg,
                paddingVertical: t.spacing.md - 2,
              }}
            >
              <AppText style={{ fontSize: 14 }}>{s.emoji}</AppText>
              <AppText variant="subheading" color={t.candyText}>
                {s.text}
              </AppText>
            </View>
          </PressableSurface>
        ))}
      </View>
    </View>
  );
}
