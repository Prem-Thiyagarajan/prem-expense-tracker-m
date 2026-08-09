import { useRef } from 'react';
import { Animated, Pressable, PressableProps, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

type BaseProps = {
  /** Hard-shadow offset in px (0 = no shadow). Defaults to card offset (3). */
  offset?: number;
  radius?: number;
  borderWidth?: number;
  backgroundColor?: string;
  borderColor?: string;
  shadowColor?: string;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
};

// Layout props belong on the OUTER wrapper (so margins/positioning don't inflate
// the wrapper and stretch the hard-shadow layer). Everything else styles the panel.
const OUTER_KEYS = new Set<string>([
  'margin',
  'marginTop',
  'marginBottom',
  'marginLeft',
  'marginRight',
  'marginHorizontal',
  'marginVertical',
  'marginStart',
  'marginEnd',
  'alignSelf',
  'flex',
  'flexGrow',
  'flexShrink',
  'flexBasis',
  'width',
  'minWidth',
  'maxWidth',
  'position',
  'top',
  'left',
  'right',
  'bottom',
  'zIndex',
]);

function splitStyle(style: StyleProp<ViewStyle>): { outer: ViewStyle; panel: ViewStyle } {
  const flat = (StyleSheet.flatten(style) ?? {}) as Record<string, unknown>;
  const outer: Record<string, unknown> = {};
  const panel: Record<string, unknown> = {};
  for (const key of Object.keys(flat)) {
    (OUTER_KEYS.has(key) ? outer : panel)[key] = flat[key];
  }
  return { outer: outer as ViewStyle, panel: panel as ViewStyle };
}

/**
 * The core Expense Tracker primitive: an opaque panel with a 2px border and a hard
 * offset shadow rendered as a translated solid layer behind it (crisp on both
 * iOS and Android, unlike native elevation).
 */
export function Surface({
  offset,
  radius,
  borderWidth,
  backgroundColor,
  borderColor,
  shadowColor,
  style,
  children,
}: BaseProps) {
  const t = useTheme();
  const o = offset ?? t.shadowOffset.card;
  const br = radius ?? t.radius.card;
  const { outer, panel: panelOverrides } = splitStyle(style);

  const panel: ViewStyle = {
    backgroundColor: backgroundColor ?? t.colors.card,
    borderColor: borderColor ?? t.colors.line,
    borderWidth: borderWidth ?? t.border.card,
    borderRadius: br,
  };

  return (
    <View style={[{ position: 'relative' }, outer]}>
      {o > 0 && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            transform: [{ translateX: o }, { translateY: o }],
            backgroundColor: shadowColor ?? t.colors.shadow,
            borderRadius: br,
          }}
        />
      )}
      <View style={[panel, panelOverrides]}>{children}</View>
    </View>
  );
}

type PressableSurfaceProps = Omit<BaseProps, 'style'> &
  Omit<PressableProps, 'style'> & {
    style?: StyleProp<ViewStyle>;
    /** How far the panel travels toward its shadow on press. Default 2px. */
    pressTravel?: number;
  };

/**
 * A Surface that animates the "press" state from the handoff: on press the
 * panel translates toward its shadow (2px,2px), shrinking the visible shadow.
 */
export function PressableSurface({
  offset,
  radius,
  borderWidth,
  backgroundColor,
  borderColor,
  shadowColor,
  style,
  children,
  pressTravel = 2,
  ...pressable
}: PressableSurfaceProps) {
  const t = useTheme();
  const o = offset ?? t.shadowOffset.card;
  const br = radius ?? t.radius.card;
  const travel = useRef(new Animated.Value(0)).current;
  const { outer, panel: panelOverrides } = splitStyle(style);

  const animate = (to: number) =>
    Animated.timing(travel, {
      toValue: to,
      duration: t.motion.press,
      useNativeDriver: true,
    }).start();

  const panel: ViewStyle = {
    backgroundColor: backgroundColor ?? t.colors.card,
    borderColor: borderColor ?? t.colors.line,
    borderWidth: borderWidth ?? t.border.card,
    borderRadius: br,
  };

  return (
    <Pressable
      onPressIn={(e) => {
        animate(pressTravel);
        pressable.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        animate(0);
        pressable.onPressOut?.(e);
      }}
      style={outer}
      {...pressable}
    >
      <View style={{ position: 'relative' }}>
        {o > 0 && (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              transform: [{ translateX: o }, { translateY: o }],
              backgroundColor: shadowColor ?? t.colors.shadow,
              borderRadius: br,
            }}
          />
        )}
        <Animated.View
          style={[panel, { transform: [{ translateX: travel }, { translateY: travel }] }, panelOverrides]}
        >
          {children}
        </Animated.View>
      </View>
    </Pressable>
  );
}
