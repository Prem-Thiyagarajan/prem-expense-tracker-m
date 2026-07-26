import { View } from 'react-native';

import { AppText, Card } from '@/components/ui';
import { useTheme } from '@/theme';

type Props = {
  /** Uppercase section label, e.g. "WHERE IT WENT" (rendered via `label`). */
  title: string;
  /** Muted right-hand annotation — a total, a unit, a hint. */
  meta?: string;
  children?: React.ReactNode;
};

/**
 * The ruled section card from the Trends design: tiny uppercase label on the
 * left, muted meta on the right, a 1.5px rule beneath, then the chart body.
 * Every Trends section uses this so the screen reads as one stack of panels
 * rather than a pile of differently-chromed cards.
 */
export function ChartCard({ title, meta, children }: Props) {
  const t = useTheme();
  return (
    <Card>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          gap: t.spacing.sm,
          paddingBottom: 7,
          borderBottomWidth: t.border.row,
          borderBottomColor: t.colors.line,
        }}
      >
        <AppText variant="label" color={t.colors.ink} numberOfLines={1} style={{ flexShrink: 1 }}>
          {title}
        </AppText>
        {meta ? (
          <AppText variant="label" tone="muted" numberOfLines={1} style={{ letterSpacing: 0.6 }}>
            {meta}
          </AppText>
        ) : null}
      </View>
      <View style={{ marginTop: t.spacing.md }}>{children}</View>
    </Card>
  );
}
