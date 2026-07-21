import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

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

const BAR_H = 62; // flat bar height
const BUMP = 22; // how far the center rises into a canopy over the FAB
const NOTCH_HALF = 74; // half-width of the raised center region (SVG bump)
const FAB = 54;
const FAB_SLOT = 72; // reserved center width in the tab row for the FAB
const OVERHANG = 24; // transparent headroom above the bar
const STROKE_PAD = 3; // keeps the 2px top stroke from clipping at the peak

const ICON_SLOT = 44; // width of an inactive (icon-only) tab
const PILL_PAD = 12; // horizontal padding inside the active label pill

/** Minimal structural type for the subset of tab bar props we use (SDK-agnostic). */
type TabBarProps = {
  state: { index: number; routes: { key: string; name: string }[] };
  navigation: {
    emit: (event: {
      type: 'tabPress';
      target: string;
      canPreventDefault: true;
    }) => { defaultPrevented: boolean };
    navigate: (name: string) => void;
  };
};

/** SVG path for the bar's top edge with a smooth upward canopy in the center. */
function buildPaths(w: number, svgH: number) {
  const cx = w / 2;
  const top = STROKE_PAD + BUMP;
  const peak = STROKE_PAD;
  const lStart = cx - NOTCH_HALF;
  const rEnd = cx + NOTCH_HALF;
  const k = NOTCH_HALF * 0.5;
  const topEdge =
    `M0,${top} L${lStart},${top} ` +
    `C${lStart + k},${top} ${cx - k},${peak} ${cx},${peak} ` +
    `C${cx + k},${peak} ${rEnd - k},${top} ${rEnd},${top} ` +
    `L${w},${top}`;
  const fill = `${topEdge} L${w},${svgH} L0,${svgH} Z`;
  return { stroke: topEdge, fill };
}

/** One tab: icon when inactive; morphs into an ink label-pill when active. */
function TabItem({
  name,
  focused,
  onPress,
}: {
  name: string;
  focused: boolean;
  onPress: () => void;
}) {
  const t = useTheme();
  const Icon = ICONS[name] ?? HomeIcon;
  const progress = useRef(new Animated.Value(focused ? 1 : 0)).current;
  const [labelW, setLabelW] = useState(0);

  useEffect(() => {
    Animated.timing(progress, {
      toValue: focused ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [focused, progress]);

  const pillW = Math.max(labelW + PILL_PAD * 2, ICON_SLOT);
  const width = progress.interpolate({ inputRange: [0, 1], outputRange: [ICON_SLOT, pillW] });
  const iconOpacity = progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0, 0] });
  const labelOpacity = progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0, 1] });

  return (
    <Pressable onPress={onPress} hitSlop={6}>
      <Animated.View
        style={{
          width,
          height: 40,
          borderRadius: 999,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {/* Ink pill fades in when active. */}
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: 999,
            backgroundColor: t.colors.ink,
            opacity: progress,
          }}
        />
        <Animated.View style={{ position: 'absolute', opacity: iconOpacity }}>
          <Icon size={22} color={t.colors.muted} />
        </Animated.View>
        <Animated.View style={{ position: 'absolute', opacity: labelOpacity }}>
          <AppText
            numberOfLines={1}
            color={t.colors.bg}
            style={{ fontFamily: t.font.bodyBold, fontSize: 12 }}
          >
            {LABELS[name]}
          </AppText>
        </Animated.View>
      </Animated.View>

      {/* Off-screen measurer for the label's natural width. */}
      <AppText
        onLayout={(e) => setLabelW(e.nativeEvent.layout.width)}
        style={{ position: 'absolute', opacity: 0, fontFamily: t.font.bodyBold, fontSize: 12 }}
      >
        {LABELS[name]}
      </AppText>
    </Pressable>
  );
}

/**
 * Dhan-style bottom bar: an upward-canopy bar (SVG, 2px ink top edge) with the
 * center ＋ FAB tucked beneath the curve. Inactive tabs are icon-only; the
 * active tab morphs into an ink pill showing its label. Each side centers its
 * pair of tabs so the icons sit close together.
 */
export function TabBar({ state, navigation }: TabBarProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { openAdd } = useAddSheet();

  const activeRoute = state.routes[state.index]?.name;
  const barH = BUMP + BAR_H + insets.bottom; // drawn bar height
  const svgH = barH + STROKE_PAD;
  const totalH = OVERHANG + barH; // container adds transparent headroom for the FAB
  const { stroke, fill } = buildPaths(width, svgH);

  const renderTab = (name: string) => {
    const route = state.routes.find((r) => r.name === name);
    if (!route) return <View key={name} style={{ width: ICON_SLOT }} />;
    const focused = activeRoute === name;
    return (
      <TabItem
        key={name}
        name={name}
        focused={focused}
        onPress={() => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
        }}
      />
    );
  };

  const half = {
    flex: 1,
    flexDirection: 'row' as const,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    gap: 12,
    overflow: 'hidden' as const,
  };

  return (
    <View
      style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: totalH }}
      pointerEvents="box-none"
    >
      <Svg width={width} height={svgH} style={{ position: 'absolute', top: OVERHANG - STROKE_PAD, left: 0 }}>
        <Path d={fill} fill={t.colors.nav} />
        <Path d={stroke} stroke={t.colors.line} strokeWidth={2} fill="none" strokeLinejoin="round" />
      </Svg>

      {/* Tab row sits below the canopy: two centered pairs around the FAB gap. */}
      <View
        style={{
          position: 'absolute',
          top: OVERHANG + BUMP,
          left: 0,
          right: 0,
          height: BAR_H,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <View style={half}>{LEFT.map(renderTab)}</View>
        <View style={{ width: FAB_SLOT }} />
        <View style={half}>{RIGHT.map(renderTab)}</View>
      </View>

      {/* Center FAB, tucked beneath the curved canopy. */}
      <View
        style={{ position: 'absolute', top: OVERHANG + 6, left: width / 2 - FAB / 2 }}
        pointerEvents="box-none"
      >
        <Pressable onPress={openAdd} hitSlop={8}>
          <Surface
            backgroundColor={t.colors.link}
            borderColor={t.colors.line}
            offset={t.shadowOffset.chip}
            radius={999}
            style={{ width: FAB, height: FAB, alignItems: 'center', justifyContent: 'center' }}
          >
            <PlusIcon size={26} color="#FFFFFF" />
          </Surface>
        </Pressable>
      </View>
    </View>
  );
}
