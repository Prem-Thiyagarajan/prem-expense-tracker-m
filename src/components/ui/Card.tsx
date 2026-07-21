import { StyleProp, ViewStyle } from 'react-native';

import { useTheme } from '@/theme';
import { Surface } from './Surface';

type Props = {
  /** Candy fill or any custom background. Defaults to the neutral card color. */
  background?: string;
  /** Border color override (e.g. for candy cards the ink line still applies). */
  borderColor?: string;
  offset?: number;
  radius?: number;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
};

/** Neutral or candy card with 2px ink border + hard shadow. */
export function Card({ background, borderColor, offset, radius, padded = true, style, children }: Props) {
  const t = useTheme();
  return (
    <Surface
      backgroundColor={background}
      borderColor={borderColor}
      offset={offset}
      radius={radius ?? t.radius.cardLg}
      style={[padded ? { padding: t.spacing.lg } : null, style]}
    >
      {children}
    </Surface>
  );
}
