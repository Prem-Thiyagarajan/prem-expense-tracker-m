import { useEffect, useState } from 'react';
import { Modal, Pressable, Share, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from './ui';

export type WrappedStory = {
  emoji: string;
  circleColor: string;
  title: string;
  big: string;
  sub: string;
  shareText: string;
};

// Fixed dark palette, independent of the app's light/dark theme — Wrapped is
// meant to read as its own "story" backdrop, like the design handoff's mock.
const WRAPPED_BG = '#1E1B16';
const WRAPPED_TEXT = '#FFF8ED';
const WRAPPED_MUTED = '#B9B2A6';
const WRAPPED_ACCENT = '#FFD43B';

/** Drag past this (or flick faster than VELOCITY_CLOSE) dismisses the sheet. */
const CLOSE_DISTANCE = 110;
const VELOCITY_CLOSE = 800;

/**
 * Full-screen Spotify-Wrapped-style story sequence for the month's spending.
 * Tap the left/right half to go back/forward a card, swipe down to dismiss —
 * no dedicated close button (it collided with the progress bar on narrower
 * phones). "Share" hands the current card's stat to the OS share sheet.
 */
export function WrappedModal({
  visible,
  onClose,
  monthLabel,
  stories,
}: {
  visible: boolean;
  onClose: () => void;
  monthLabel: string;
  stories: WrappedStory[];
}) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [width, setWidth] = useState(0);
  const translateY = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setStep(0);
      translateY.value = 0;
    }
  }, [visible, translateY]);

  const isLast = step >= stories.length - 1;
  const isFirst = step <= 0;

  const goNext = () => setStep((s) => (s >= stories.length - 1 ? s : s + 1));
  const goPrev = () => setStep((s) => (s <= 0 ? 0 : s - 1));
  const finish = () => onClose();

  const share = () => {
    const current = stories[Math.min(step, stories.length - 1)];
    Share.share({ message: current.shareText }).catch(() => {});
  };

  // A single Pan gesture handles both taps and the swipe-to-dismiss, rather
  // than racing a separate Tap gesture against a Pan one — RNGH's arbitration
  // between two different gesture types on the same view was unreliable here
  // (taps intermittently got eaten with a "can't cancel already finished
  // gesture" warning). `minDistance(0)` makes it activate immediately on
  // touch-down, including a perfectly stationary tap; onEnd then tells a tap
  // apart from a real swipe by how far the finger actually travelled.
  const panGesture = Gesture.Pan()
    .minDistance(0)
    .maxPointers(1)
    .onUpdate((e) => {
      if (e.translationY > 0) translateY.value = e.translationY;
    })
    .onEnd((e) => {
      const isTap = Math.abs(e.translationX) < 10 && Math.abs(e.translationY) < 10;
      if (isTap) {
        translateY.value = withSpring(0, { damping: 20, stiffness: 220 });
        if (width > 0 && e.x < width / 2) runOnJS(isFirst ? finish : goPrev)();
        else runOnJS(isLast ? finish : goNext)();
        return;
      }
      if (e.translationY > CLOSE_DISTANCE || e.velocityY > VELOCITY_CLOSE) {
        translateY.value = withTiming(800, { duration: 200 }, (finished) => {
          if (finished) runOnJS(onClose)();
        });
      } else {
        translateY.value = withSpring(0, { damping: 20, stiffness: 220 });
      }
    });

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (stories.length === 0) return null;
  const current = stories[Math.min(step, stories.length - 1)];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View
          style={{
            flex: 1,
            backgroundColor: WRAPPED_BG,
            paddingTop: insets.top + 8,
            paddingBottom: insets.bottom + 20,
          }}
        >
          <View style={{ flexDirection: 'row', gap: 4, paddingHorizontal: 22 }}>
            {stories.map((_, i) => (
              <View
                key={i}
                style={{
                  flex: 1,
                  height: 3,
                  borderRadius: 99,
                  backgroundColor: i <= step ? WRAPPED_ACCENT : 'rgba(255,248,237,0.25)',
                }}
              />
            ))}
          </View>

          <GestureDetector gesture={panGesture}>
            <Animated.View
              style={[{ flex: 1 }, contentStyle]}
              onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
            >
              <View
                style={{
                  flex: 1,
                  paddingHorizontal: 28,
                  paddingTop: 40,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AppText variant="label" color={WRAPPED_ACCENT}>
                  {monthLabel.toUpperCase()} WRAPPED · {step + 1}/{stories.length}
                </AppText>
                <AppText
                  variant="hero"
                  color={WRAPPED_TEXT}
                  style={{ textAlign: 'center', marginTop: 14, fontSize: 26, lineHeight: 32 }}
                >
                  {current.title}
                </AppText>

                <View
                  style={{
                    width: 116,
                    height: 116,
                    borderRadius: 58,
                    backgroundColor: current.circleColor,
                    borderWidth: 3,
                    borderColor: WRAPPED_TEXT,
                    marginTop: 26,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AppText style={{ fontSize: 46 }}>{current.emoji}</AppText>
                </View>

                <AppText variant="money" color={WRAPPED_TEXT} style={{ fontSize: 38, marginTop: 20 }}>
                  {current.big}
                </AppText>
                <AppText
                  variant="bodyMedium"
                  color={WRAPPED_MUTED}
                  style={{ fontSize: 12, marginTop: 4, textAlign: 'center' }}
                >
                  {current.sub}
                </AppText>
              </View>
            </Animated.View>
          </GestureDetector>

          <View style={{ flexDirection: 'row', justifyContent: 'center', paddingBottom: 4 }}>
            <Pressable
              onPress={share}
              style={{
                backgroundColor: WRAPPED_ACCENT,
                borderRadius: 99,
                paddingHorizontal: 18,
                paddingVertical: 9,
              }}
            >
              <AppText variant="heading" color="#1E1B16" style={{ fontSize: 12 }}>
                Share ↗
              </AppText>
            </Pressable>
          </View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}
