import { useRef } from 'react';
import { Animated, Pressable, PressableProps, StyleProp, View, ViewStyle } from 'react-native';

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

/**
 * The core "Pocket" primitive: an opaque panel with a 2px border and a hard
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

  const panel: ViewStyle = {
    backgroundColor: backgroundColor ?? t.colors.card,
    borderColor: borderColor ?? t.colors.line,
    borderWidth: borderWidth ?? t.border.card,
    borderRadius: br,
  };

  return (
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
      <View style={[panel, style]}>{children}</View>
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
          style={[panel, { transform: [{ translateX: travel }, { translateY: travel }] }, style]}
        >
          {children}
        </Animated.View>
      </View>
    </Pressable>
  );
}
