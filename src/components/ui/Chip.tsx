import { Pressable, View, ViewStyle } from 'react-native';

import { useTheme } from '@/theme';
import { AppText } from './AppText';
import { Surface } from './Surface';

type Props = {
  label: string;
  onPress?: () => void;
  /** Selected chips get a candy fill + 2px border + shadow (per handoff). */
  selected?: boolean;
  candyColor?: string;
  left?: React.ReactNode;
  style?: ViewStyle;
};

/** Small pill: 1.5px border, rounded/pill. Selected = candy fill + hard shadow. */
export function Chip({ label, onPress, selected, candyColor, left, style }: Props) {
  const t = useTheme();
  const bg = selected ? candyColor ?? t.candy.yellow : t.colors.card;

  const content = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: t.spacing.xs,
        paddingVertical: 8,
        paddingHorizontal: t.spacing.md,
      }}
    >
      {left}
      <AppText
        variant="subheading"
        color={selected ? t.candyText : t.colors.ink}
        style={{ fontSize: 13 }}
      >
        {label}
      </AppText>
    </View>
  );

  const inner = (
    <Surface
      backgroundColor={bg}
      borderWidth={t.border.row}
      radius={t.radius.pill}
      offset={selected ? t.shadowOffset.chip : 0}
      style={style}
    >
      {content}
    </Surface>
  );

  if (!onPress) return inner;
  return (
    <Pressable onPress={onPress} hitSlop={6}>
      {inner}
    </Pressable>
  );
}
