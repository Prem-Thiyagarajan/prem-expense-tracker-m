import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { useTheme } from '@/theme';
import { AppText } from '../ui/AppText';
import { Surface } from '../ui/Surface';

type Props = {
  onSend: (text: string) => void;
  onStop: () => void;
  isBusy: boolean;
  disabled?: boolean;
  /** Pre-filled question from a suggestion chip or a contextual entry point. */
  value: string;
  onChangeText: (text: string) => void;
};

/**
 * Pinned input row. While a reply is streaming the send button becomes a stop
 * square, so a long answer (they can run to a minute) is interruptible rather
 * than something the user has to sit through.
 *
 * The microphone is deliberately absent until voice lands — a visible mic that
 * does nothing is worse than no mic. It slots in to the left of the input.
 */
export function Composer({ onSend, onStop, isBusy, disabled, value, onChangeText }: Props) {
  const t = useTheme();
  const [focused, setFocused] = useState(false);
  const canSend = value.trim().length > 0 && !isBusy && !disabled;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: t.spacing.sm }}>
      <View
        style={{
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: t.colors.card,
          borderWidth: t.border.card,
          borderColor: focused ? t.colors.ink : t.colors.line,
          borderRadius: t.radius.chip,
          paddingHorizontal: t.spacing.md,
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          editable={!disabled}
          placeholder={disabled ? 'Assistant unavailable' : 'Ask about your spending…'}
          placeholderTextColor={t.colors.faint}
          multiline
          // Cap the growth so a long question can't push the conversation
          // off-screen; it scrolls internally past this point.
          style={{
            flex: 1,
            maxHeight: 110,
            paddingVertical: 12,
            fontFamily: t.font.body,
            fontSize: 15,
            color: t.colors.ink,
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onSubmitEditing={() => canSend && onSend(value)}
          returnKeyType="send"
          blurOnSubmit={false}
        />
      </View>

      <Pressable
        onPress={isBusy ? onStop : () => canSend && onSend(value)}
        disabled={!isBusy && !canSend}
        hitSlop={6}
      >
        <Surface
          backgroundColor={isBusy ? t.candy.coral : canSend ? t.candy.yellow : t.colors.hair}
          offset={t.shadowOffset.chip}
          radius={t.radius.chip}
          style={{ width: 46, height: 46, alignItems: 'center', justifyContent: 'center' }}
        >
          {isBusy ? (
            <View
              style={{
                width: 13,
                height: 13,
                borderRadius: 3,
                backgroundColor: t.candyText,
              }}
            />
          ) : (
            <AppText
              variant="subheading"
              color={canSend ? t.candyText : t.colors.faint}
              style={{ fontSize: 17 }}
            >
              ↑
            </AppText>
          )}
        </Surface>
      </Pressable>
    </View>
  );
}
