import { ScrollView, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';

type Props = {
  children: React.ReactNode;
  /** Scrollable body (default) vs a fixed non-scrolling screen. */
  scroll?: boolean;
  /** Extra bottom padding to clear the floating tab bar. */
  tabBarInset?: boolean;
  contentStyle?: ViewStyle;
};

/** Cream-background screen wrapper with safe-area handling and hidden scrollbars. */
export function Screen({ children, scroll = true, tabBarInset = true, contentStyle }: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();

  const padding: ViewStyle = {
    paddingTop: insets.top + t.spacing.sm,
    paddingHorizontal: t.spacing.lg,
    paddingBottom: (tabBarInset ? 108 : t.spacing.lg) + insets.bottom,
  };

  if (!scroll) {
    return (
      <View style={{ flex: 1, backgroundColor: t.colors.bg }}>
        <View style={[padding, { flex: 1 }, contentStyle]}>{children}</View>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: t.colors.bg }}
      contentContainerStyle={[padding, contentStyle]}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}
