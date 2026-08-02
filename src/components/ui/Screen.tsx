import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Keyboard,
  Platform,
  ScrollView,
  TextInput,
  View,
  ViewStyle,
  type KeyboardEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';
import { StatusBarScrim } from './StatusBarScrim';

type Props = {
  children: React.ReactNode;
  /** Scrollable body (default) vs a fixed non-scrolling screen. */
  scroll?: boolean;
  /** Extra bottom padding to clear the floating tab bar. */
  tabBarInset?: boolean;
  contentStyle?: ViewStyle;
};

/** Breathing room left between a focused input and the top of the keyboard. */
const KEYBOARD_GAP = 24;

/**
 * Cream-background screen wrapper with safe-area handling and hidden scrollbars.
 *
 * The scroll view deliberately spans the full window rather than starting below
 * the notch — only its *content* is padded down — so cards pass under the status
 * bar instead of stopping short of it. `StatusBarScrim` masks that band and
 * grows a rule as you scroll, which is what makes the top bar read as a fixed
 * layer over the page.
 *
 * Keyboard handling is deliberately JS-only (no native keyboard module, so the
 * Expo Go / existing-binary workflow keeps working): Android has been
 * edge-to-edge since SDK 54, meaning the window no longer resizes for the IME
 * and a plain ScrollView leaves low fields (a form's last input, its submit
 * button) stranded behind the keyboard. Instead, when the keyboard reports
 * itself we pad the content by its height and scroll the focused input into
 * view, measured against the keyboard's own top edge.
 */
export function Screen({ children, scroll = true, tabBarInset = true, contentStyle }: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView>(null);
  const offsetRef = useRef(0);
  const [keyboardPad, setKeyboardPad] = useState(0);

  useEffect(() => {
    // iOS emits "will" events (pad before it lands); Android only emits "did".
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = (e: KeyboardEvent) => {
      const keyboard = e.endCoordinates;
      setKeyboardPad(keyboard.height);
      // Reveal whichever input has focus: measure it in window coordinates and
      // scroll just far enough that it clears the keyboard's top edge.
      const input = TextInput.State.currentlyFocusedInput();
      input?.measureInWindow((_x, y, _w, h) => {
        const overlap = y + h + KEYBOARD_GAP - keyboard.screenY;
        if (overlap <= 0) return;
        // Next frame, so the padding above has landed and there is room to
        // scroll into (scrollTo clamps against the old content size otherwise).
        requestAnimationFrame(() => {
          scrollRef.current?.scrollTo({ y: offsetRef.current + overlap, animated: true });
        });
      });
    };

    const show = Keyboard.addListener(showEvent, onShow);
    const hide = Keyboard.addListener(hideEvent, () => setKeyboardPad(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const padding: ViewStyle = {
    paddingTop: insets.top + t.spacing.sm,
    paddingHorizontal: t.spacing.lg,
    paddingBottom: (tabBarInset ? 120 : t.spacing.lg) + insets.bottom + keyboardPad,
  };

  if (!scroll) {
    // Nothing moves, so the scrim stays a plain masking strip (offset is 0, so
    // its rule never fades in).
    return (
      <View style={{ flex: 1, backgroundColor: t.colors.bg }}>
        <View style={[padding, { flex: 1 }, contentStyle]}>{children}</View>
        <StatusBarScrim scrollY={scrollY} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg }}>
      <Animated.ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={[padding, contentStyle]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: true,
          // The reveal math needs the current offset on the JS side too.
          listener: (e) => {
            offsetRef.current = (e as { nativeEvent: { contentOffset: { y: number } } })
              .nativeEvent.contentOffset.y;
          },
        })}
      >
        {children}
      </Animated.ScrollView>
      {/* Sibling of the scroll view, so it paints above the scrolling content. */}
      <StatusBarScrim scrollY={scrollY} />
    </View>
  );
}
