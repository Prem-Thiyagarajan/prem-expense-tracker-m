import { useRef } from 'react';
import { Animated, View, ViewStyle } from 'react-native';
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

/**
 * Cream-background screen wrapper with safe-area handling and hidden scrollbars.
 *
 * The scroll view deliberately spans the full window rather than starting below
 * the notch — only its *content* is padded down — so cards pass under the status
 * bar instead of stopping short of it. `StatusBarScrim` masks that band and
 * grows a rule as you scroll, which is what makes the top bar read as a fixed
 * layer over the page.
 */
export function Screen({ children, scroll = true, tabBarInset = true, contentStyle }: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;

  const padding: ViewStyle = {
    paddingTop: insets.top + t.spacing.sm,
    paddingHorizontal: t.spacing.lg,
    paddingBottom: (tabBarInset ? 120 : t.spacing.lg) + insets.bottom,
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
        style={{ flex: 1 }}
        contentContainerStyle={[padding, contentStyle]}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: true,
        })}
      >
        {children}
      </Animated.ScrollView>
      {/* Sibling of the scroll view, so it paints above the scrolling content. */}
      <StatusBarScrim scrollY={scrollY} />
    </View>
  );
}
