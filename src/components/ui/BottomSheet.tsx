import { useCallback, useEffect } from 'react';
import { Keyboard, Modal, Platform, Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';

/** Travel distance before the sheet's real height is measured. */
const FALLBACK_H = 800;
/** Drag past this (or flick faster than VELOCITY_CLOSE) to dismiss. */
const CLOSE_DISTANCE = 110;
const VELOCITY_CLOSE = 800;
/**
 * Scrim left visible below the status bar. Without a top bound a tall sheet
 * grows until its grabber sits under the system status bar, and dragging it
 * down pulls the notification shade instead of the sheet.
 */
const TOP_GAP = 24;

type Props = {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Optional fixed/max height; otherwise the sheet hugs its content. */
  style?: ViewStyle;
};

/**
 * Bottom sheet: cream bg, 2px top border, 28 top radius, sliding up over a 45%
 * ink scrim. Dismissed by dragging the grabber down, tapping the scrim, or the
 * hardware back button — so sheets don't need their own close button.
 *
 * The drag lives on the grabber rather than the whole panel, so sheets
 * containing a scrollable list still scroll normally.
 */
export function BottomSheet({ visible, onClose, children, style }: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();

  const translateY = useSharedValue(FALLBACK_H);
  const scrim = useSharedValue(0);
  const sheetH = useSharedValue(FALLBACK_H);

  /**
   * Keyboard height, tracked by hand rather than with `KeyboardAvoidingView`:
   * under Android edge-to-edge (the default since Expo SDK 54) that component
   * does not reliably return its padding to zero when the IME hides, leaving a
   * dead gap below the sheet. Listening to the events directly makes the closed
   * state unambiguous — hide always means zero.
   */
  const keyboardH = useSharedValue(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, (e) => {
      keyboardH.value = withTiming(e.endCoordinates.height, { duration: 220 });
    });
    const hide = Keyboard.addListener(hideEvent, () => {
      keyboardH.value = withTiming(0, { duration: 180 });
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, [keyboardH]);

  useEffect(() => {
    if (visible) {
      translateY.value = withTiming(0, { duration: 260, easing: Easing.out(Easing.cubic) });
      scrim.value = withTiming(1, { duration: 260 });
    } else {
      // Reset instantly while hidden so the next open animates from off-screen.
      translateY.value = sheetH.value;
      scrim.value = 0;
    }
  }, [visible, translateY, scrim, sheetH]);

  /**
   * Animate the sheet down and out, then notify the parent to unmount it.
   * Called from JS (scrim tap / hardware back); shared-value writes from the JS
   * thread are scheduled on the UI thread by Reanimated.
   */
  const dismiss = useCallback(() => {
    scrim.value = withTiming(0, { duration: 200 });
    translateY.value = withTiming(
      sheetH.value,
      { duration: 200, easing: Easing.in(Easing.cubic) },
      (finished) => {
        if (finished) runOnJS(onClose)();
      },
    );
  }, [translateY, scrim, sheetH, onClose]);

  const close = useCallback(() => onClose(), [onClose]);

  const dragToDismiss = Gesture.Pan()
    .onUpdate((e) => {
      // Downward only — dragging up shouldn't lift the sheet off its edge.
      const dy = Math.max(0, e.translationY);
      translateY.value = dy;
      scrim.value = 1 - Math.min(1, dy / sheetH.value);
    })
    .onEnd((e) => {
      if (e.translationY > CLOSE_DISTANCE || e.velocityY > VELOCITY_CLOSE) {
        // Finish the close animation on the UI thread for a smooth drag-off.
        scrim.value = withTiming(0, { duration: 200 });
        translateY.value = withTiming(sheetH.value, { duration: 200 }, (finished) => {
          if (finished) runOnJS(close)();
        });
      } else {
        translateY.value = withSpring(0, { damping: 20, stiffness: 220 });
        scrim.value = withTiming(1, { duration: 160 });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  const scrimStyle = useAnimatedStyle(() => ({ opacity: scrim.value }));
  // The sheet already pads itself by `insets.bottom`, so subtract that here —
  // otherwise the nav-bar inset is counted twice while the keyboard is up.
  const keyboardStyle = useAnimatedStyle(() => ({
    paddingBottom: Math.max(0, keyboardH.value - insets.bottom),
  }));

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={dismiss}>
      {/* Gestures inside an RN Modal need their own root on Android. */}
      <GestureHandlerRootView style={{ flex: 1 }}>
        {/* Full-bleed scrim. Kept as a sibling of the padded container below so
            it still covers the status-bar strip that TOP_GAP reserves. */}
        <Animated.View
          style={[StyleSheet.absoluteFill, { backgroundColor: t.colors.scrim }, scrimStyle]}
        >
          <Pressable style={{ flex: 1 }} onPress={dismiss} />
        </Animated.View>

        {/* Bounds the sheet on both edges: TOP_GAP keeps a tall sheet's grabber
            clear of the status bar (dragging there pulls the notification shade
            instead of the sheet), and the animated bottom padding lifts it over
            the keyboard. `box-none` lets taps in the empty area above the sheet
            fall through to the scrim. The sheet's `flexShrink` lets it give way
            when the remaining space is tight. */}
        <Animated.View
          pointerEvents="box-none"
          style={[
            { flex: 1, justifyContent: 'flex-end', paddingTop: insets.top + TOP_GAP },
            keyboardStyle,
          ]}
        >
          <Animated.View
            onLayout={(e) => {
              sheetH.value = e.nativeEvent.layout.height;
            }}
            style={[
              {
                backgroundColor: t.colors.bg,
                borderTopWidth: 2,
                borderColor: t.colors.line,
                borderTopLeftRadius: t.radius.sheet,
                borderTopRightRadius: t.radius.sheet,
                paddingBottom: insets.bottom + t.spacing.lg,
                paddingHorizontal: t.spacing.lg,
                // Lets the panel give way when the keyboard shrinks the
                // available height, instead of overflowing off the top.
                flexShrink: 1,
              },
              style,
              sheetStyle,
            ]}
          >
            {/* Drag handle: 44×5 grabber in a tall, full-width grab area. */}
            <GestureDetector gesture={dragToDismiss}>
              <View
                style={{
                  alignItems: 'center',
                  paddingTop: t.spacing.md,
                  paddingBottom: t.spacing.md,
                }}
              >
                <View
                  style={{
                    width: 44,
                    height: 5,
                    borderRadius: 3,
                    backgroundColor: t.colors.ink,
                    opacity: 0.25,
                  }}
                />
              </View>
            </GestureDetector>
            {children}
          </Animated.View>
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}
