import { Animated, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';

/** How far you scroll before the divider is fully drawn. */
const FADE_DISTANCE = 14;

/**
 * An opaque strip covering the system status bar, with a rule that fades in once
 * the content beneath it starts to move.
 *
 * A `Screen`'s ScrollView spans the full window and only pads its *content* down
 * past the notch, so scrolled content used to travel up behind the clock and
 * battery with nothing masking it. This lays the screen's own background over
 * that band — content now slides cleanly underneath — and the rule appearing on
 * scroll is what tells you the bar is a fixed layer rather than part of the page.
 *
 * Purely decorative, so it never takes touches.
 */
export function StatusBarScrim({ scrollY }: { scrollY: Animated.Value }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();

  const dividerOpacity = scrollY.interpolate({
    inputRange: [0, FADE_DISTANCE],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: insets.top,
        backgroundColor: t.colors.bg,
      }}
    >
      <Animated.View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: t.border.row,
          backgroundColor: t.colors.line,
          opacity: dividerOpacity,
        }}
      />
    </View>
  );
}
