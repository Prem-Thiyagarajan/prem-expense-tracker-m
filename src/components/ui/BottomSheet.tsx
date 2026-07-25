import { useCallback, useEffect } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, View, ViewStyle } from 'react-native';
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

type Props = {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Optional fixed height; otherwise the sheet hugs its content. */
  style?: ViewStyle;
};

// Release thresholds for the pull-down-to-dismiss gesture.
const CLOSE_DISTANCE = 120; // px dragged
const CLOSE_VELOCITY = 800; // px/s flick
const HIDDEN = 900; // fallback offscreen distance before the sheet has measured

/**
 * Bottom sheet: cream bg, 2px top border, 28 top radius, drag grabber, sliding
 * up over a 45% ink scrim. Tap the scrim or pull the sheet down by its grabber
 * to close.
 */
export function BottomSheet({ visible, onClose, children, style }: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const y = useSharedValue(HIDDEN); // sheet translateY: 0 = shown
  const scrim = useSharedValue(0);
  const height = useSharedValue(HIDDEN); // measured sheet height = fully-hidden offset

  useEffect(() => {
    if (visible) {
      y.value = withTiming(0, { duration: 260, easing: Easing.out(Easing.cubic) });
      scrim.value = withTiming(1, { duration: 260 });
    } else {
      y.value = height.value;
      scrim.value = 0;
    }
  }, [visible, y, scrim, height]);

  // Animate the sheet down and out, then notify the parent to unmount it.
  // Called from JS (scrim tap / back button); shared-value writes from the JS
  // thread are scheduled on the UI thread by Reanimated.
  const dismiss = useCallback(() => {
    scrim.value = withTiming(0, { duration: 200 });
    y.value = withTiming(
      height.value,
      { duration: 200, easing: Easing.in(Easing.cubic) },
      (finished) => {
        if (finished) runOnJS(onClose)();
      },
    );
  }, [y, scrim, height, onClose]);

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      y.value = Math.max(0, e.translationY);
    })
    .onEnd((e) => {
      if (e.translationY > CLOSE_DISTANCE || e.velocityY > CLOSE_VELOCITY) {
        // Run the close animation on the UI thread for a smooth drag-off.
        scrim.value = withTiming(0, { duration: 200 });
        y.value = withTiming(
          height.value,
          { duration: 200, easing: Easing.in(Easing.cubic) },
          (finished) => {
            if (finished) runOnJS(onClose)();
          },
        );
      } else {
        y.value = withSpring(0, { damping: 18, stiffness: 220 });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const scrimStyle = useAnimatedStyle(() => ({ opacity: scrim.value }));

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={dismiss}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, justifyContent: 'flex-end' }}
        >
          <Animated.View
            style={[
              { ...StyleSheetAbsolute, backgroundColor: t.colors.scrim },
              scrimStyle,
            ]}
          >
            <Pressable style={{ flex: 1 }} onPress={dismiss} />
          </Animated.View>

          <Animated.View
            onLayout={(e) => {
              height.value = e.nativeEvent.layout.height;
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
              },
              style,
              sheetStyle,
            ]}
          >
            {/* Drag grabber — pull down to dismiss. */}
            <GestureDetector gesture={pan}>
              <View style={{ alignItems: 'center', paddingTop: t.spacing.md, paddingBottom: t.spacing.md }}>
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
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}

const StyleSheetAbsolute = {
  position: 'absolute' as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
};
