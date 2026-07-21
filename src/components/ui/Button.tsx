import { ActivityIndicator, StyleProp, View, ViewStyle } from 'react-native';

import { useTheme } from '@/theme';
import { AppText } from './AppText';
import { PressableSurface } from './Surface';

type Variant = 'primary' | 'candy' | 'neutral' | 'danger';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  /** Candy key when variant='candy' (e.g. 'yellow', 'coral'). */
  candyColor?: string;
  loading?: boolean;
  disabled?: boolean;
  left?: React.ReactNode;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  candyColor,
  loading,
  disabled,
  left,
  fullWidth = true,
  style,
}: Props) {
  const t = useTheme();

  const bg: Record<Variant, string> = {
    primary: t.colors.link,
    candy: candyColor ?? t.candy.yellow,
    neutral: t.colors.card,
    danger: t.semantic.red,
  };
  // Blue and danger buttons carry cream text; candy/neutral carry ink text.
  const fg: Record<Variant, string> = {
    primary: '#FFFFFF',
    candy: t.candyText,
    neutral: t.colors.ink,
    danger: '#FFFFFF',
  };

  return (
    <PressableSurface
      onPress={disabled || loading ? undefined : onPress}
      disabled={disabled || loading}
      backgroundColor={bg[variant]}
      radius={t.radius.chip}
      offset={t.shadowOffset.chip}
      style={[
        {
          paddingVertical: 14,
          paddingHorizontal: t.spacing.lg,
          minHeight: 48,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled ? 0.5 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        style,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm }}>
        {loading ? (
          <ActivityIndicator color={fg[variant]} />
        ) : (
          <>
            {left}
            <AppText variant="heading" color={fg[variant]} style={{ fontSize: 15 }}>
              {label}
            </AppText>
          </>
        )}
      </View>
    </PressableSurface>
  );
}
