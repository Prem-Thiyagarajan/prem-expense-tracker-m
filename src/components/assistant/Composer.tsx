import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, TextInput, View } from 'react-native';

import { MAX_RECORDING_SECONDS, type VoiceState } from '@/hooks/useVoiceInput';
import { useTheme } from '@/theme';
import { AppText } from '../ui/AppText';
import { Surface } from '../ui/Surface';

type Props = {
  onSend: (text: string) => void;
  onStop: () => void;
  isBusy: boolean;
  disabled?: boolean;
  value: string;
  onChangeText: (text: string) => void;
  // Voice
  voiceState: VoiceState;
  voiceSeconds: number;
  voiceAvailable: boolean;
  onMicPress: () => void;
  onMicRelease: () => void;
  onMicCancel: () => void;
  onMicUnavailable: () => void;
};

/**
 * Pinned input row: mic, text field, send/stop.
 *
 * While a reply streams the send button becomes a stop square, so a long answer
 * is interruptible. While recording the whole row is replaced by the recording
 * bar — there is nothing useful to type mid-recording, and the swap makes the
 * mic's state unmistakable.
 */
export function Composer({
  onSend,
  onStop,
  isBusy,
  disabled,
  value,
  onChangeText,
  voiceState,
  voiceSeconds,
  voiceAvailable,
  onMicPress,
  onMicRelease,
  onMicCancel,
  onMicUnavailable,
}: Props) {
  const t = useTheme();
  const [focused, setFocused] = useState(false);
  const canSend = value.trim().length > 0 && !isBusy && !disabled;

  if (voiceState === 'recording') {
    return (
      <RecordingBar
        seconds={voiceSeconds}
        onStop={onMicRelease}
        onCancel={onMicCancel}
      />
    );
  }

  const transcribing = voiceState === 'transcribing';

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: t.spacing.sm }}>
      {/* Mic. Rendered even when voice is unavailable — hiding it makes users
          think the feature vanished, and a silently dead button reads as a bug.
          Tapping it explains why instead of doing nothing. */}
      <Pressable
        onPress={voiceAvailable && !isBusy ? onMicPress : onMicUnavailable}
        disabled={transcribing}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={voiceAvailable ? 'Record a question' : 'Voice input unavailable'}
      >
        <Surface
          backgroundColor={voiceAvailable && !isBusy ? t.candy.coral : t.colors.hair}
          offset={t.shadowOffset.chip}
          radius={t.radius.chip}
          style={{
            width: 46,
            height: 46,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: transcribing ? 0.6 : 1,
          }}
        >
          <AppText style={{ fontSize: 18, opacity: voiceAvailable && !isBusy ? 1 : 0.45 }}>
            🎙️
          </AppText>
        </Surface>
      </Pressable>

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
          editable={!disabled && !transcribing}
          placeholder={
            transcribing
              ? 'Transcribing…'
              : disabled
                ? 'Assistant unavailable'
                : 'Ask about your spending…'
          }
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
            <View style={{ width: 13, height: 13, borderRadius: 3, backgroundColor: t.candyText }} />
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

/** Replaces the whole row while recording: cancel · waveform + timer · done. */
function RecordingBar({
  seconds,
  onStop,
  onCancel,
}: {
  seconds: number;
  onStop: () => void;
  onCancel: () => void;
}) {
  const t = useTheme();
  const remaining = MAX_RECORDING_SECONDS - seconds;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm }}>
      <Pressable onPress={onCancel} hitSlop={6} accessibilityLabel="Cancel recording">
        <Surface
          backgroundColor={t.colors.hair}
          offset={t.shadowOffset.chip}
          radius={t.radius.chip}
          style={{ width: 46, height: 46, alignItems: 'center', justifyContent: 'center' }}
        >
          <AppText variant="subheading" tone="muted" style={{ fontSize: 17 }}>
            ✕
          </AppText>
        </Surface>
      </Pressable>

      <Surface
        backgroundColor={t.candy.coral}
        offset={t.shadowOffset.chip}
        radius={t.radius.chip}
        style={{
          flex: 1,
          height: 46,
          flexDirection: 'row',
          alignItems: 'center',
          gap: t.spacing.sm,
          paddingHorizontal: t.spacing.md,
        }}
      >
        <Waveform />
        <AppText variant="subheading" color={t.candyText} style={{ fontSize: 13 }}>
          {formatClock(seconds)}
        </AppText>
        {/* Only warn near the ceiling — a permanent countdown reads as pressure. */}
        {remaining <= 10 ? (
          <AppText variant="body" color={t.candyText} style={{ fontSize: 11, opacity: 0.75 }}>
            {remaining}s left
          </AppText>
        ) : null}
      </Surface>

      <Pressable onPress={onStop} hitSlop={6} accessibilityLabel="Finish recording">
        <Surface
          backgroundColor={t.candy.yellow}
          offset={t.shadowOffset.chip}
          radius={t.radius.chip}
          style={{ width: 46, height: 46, alignItems: 'center', justifyContent: 'center' }}
        >
          <AppText variant="subheading" color={t.candyText} style={{ fontSize: 17 }}>
            ✓
          </AppText>
        </Surface>
      </Pressable>
    </View>
  );
}

function formatClock(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** Five bars breathing at different rates — enough to read as "listening". */
function Waveform() {
  const t = useTheme();
  const bars = useRef([0, 1, 2, 3, 4].map(() => new Animated.Value(0.35))).current;

  useEffect(() => {
    const loops = bars.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(v, {
            toValue: 1,
            duration: 300 + i * 70,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(v, {
            toValue: 0.35,
            duration: 300 + i * 70,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      ),
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [bars]);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, height: 20 }}>
      {bars.map((v, i) => (
        <Animated.View
          key={i}
          style={{
            width: 3,
            height: 18,
            borderRadius: 2,
            backgroundColor: t.candyText,
            transform: [{ scaleY: v }],
          }}
        />
      ))}
    </View>
  );
}
