import { View } from 'react-native';

import { categoryVisual } from '@/lib/categoryVisual';
import { useTheme } from '@/theme';
import { AppText } from './ui';

type Props = {
  iconName?: string | null;
  name?: string | null;
  /** 38 for list rows, 32 for grids (CONVENTIONS §1). */
  size?: 38 | 32;
};

/**
 * A category's emoji on a candy-tinted rounded square with a 1.5px ink border.
 * The one place badge chrome is defined — compose this rather than rebuilding
 * the circle/square inline, so every screen's category badges stay identical.
 */
export function CategoryBadge({ iconName, name, size = 38 }: Props) {
  const t = useTheme();
  const visual = categoryVisual(iconName, name);

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: t.radius.chip,
        backgroundColor: visual.color,
        borderWidth: t.border.row,
        borderColor: t.colors.line,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <AppText style={{ fontSize: size === 38 ? 17 : 15 }}>{visual.emoji}</AppText>
    </View>
  );
}
