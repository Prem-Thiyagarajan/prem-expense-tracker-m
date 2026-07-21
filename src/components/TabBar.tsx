import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';
import { useAddSheet } from './AddSheetHost';
import { HomeIcon, PlusIcon, ReceiptIcon, TargetIcon, TrendsIcon } from './icons';
import { AppText } from './ui/AppText';
import { Surface } from './ui/Surface';

const ICONS: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  index: HomeIcon,
  trends: TrendsIcon,
  expenses: ReceiptIcon,
  budget: TargetIcon,
};

const LABELS: Record<string, string> = {
  index: 'Home',
  trends: 'Trends',
  expenses: 'Expenses',
  budget: 'Budget',
};

// Visual order around the center FAB.
const LEFT = ['index', 'trends'];
const RIGHT = ['expenses', 'budget'];

/**
 * Custom bottom tab bar (README §Navigation): nav-token bg, 2px top border,
 * Home · Trends · [＋] · Expenses · Budget. Active tab = full opacity + 2px
 * yellow underline; inactive 40%. Center ＋ = blue FAB overlapping the bar.
 */
export function TabBar({ state, navigation }: BottomTabBarProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { openAdd } = useAddSheet();

  const activeRoute = state.routes[state.index]?.name;

  const renderTab = (name: string) => {
    const route = state.routes.find((r) => r.name === name);
    if (!route) return <View key={name} style={{ flex: 1 }} />;
    const focused = activeRoute === name;
    const Icon = ICONS[name] ?? HomeIcon;

    const onPress = () => {
      const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
    };

    return (
      <Pressable key={name} onPress={onPress} style={{ flex: 1, alignItems: 'center' }} hitSlop={8}>
        <View style={{ alignItems: 'center', opacity: focused ? 1 : 0.4, gap: 3 }}>
          <Icon size={22} color={t.colors.ink} />
          <AppText variant="label" color={t.colors.ink} style={{ fontSize: 9, letterSpacing: 0.6 }}>
            {LABELS[name]}
          </AppText>
          <View
            style={{
              height: 2,
              width: 18,
              borderRadius: 2,
              backgroundColor: focused ? t.candy.yellow : 'transparent',
            }}
          />
        </View>
      </Pressable>
    );
  };

  return (
    <View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: t.colors.nav,
        borderTopWidth: 2,
        borderTopColor: t.colors.line,
        paddingBottom: insets.bottom,
        paddingTop: 8,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', height: 60 }}>
        {LEFT.map(renderTab)}

        {/* Center FAB — overlaps the bar by 24px, opens the Add sheet. */}
        <View style={{ width: 72, alignItems: 'center' }}>
          <View style={{ marginTop: -24 }}>
            <Pressable onPress={openAdd} hitSlop={8}>
              <Surface
                backgroundColor={t.colors.link}
                borderColor={t.colors.line}
                offset={t.shadowOffset.chip}
                radius={999}
                style={{ width: 46, height: 46, alignItems: 'center', justifyContent: 'center' }}
              >
                <PlusIcon size={24} color="#FFFFFF" />
              </Surface>
            </Pressable>
          </View>
        </View>

        {RIGHT.map(renderTab)}
      </View>
    </View>
  );
}
