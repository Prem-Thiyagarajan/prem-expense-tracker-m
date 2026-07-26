import { View } from 'react-native';

import { AppText } from '@/components/ui';
import { useTheme } from '@/theme';

export type LegendItem = { label: string; color: string; dashed?: boolean };

/**
 * The shared series key beneath a chart: a short rule in the series color (its
 * dash pattern mirrored) plus the label. One implementation so every chart's
 * legend reads identically.
 */
export function ChartLegend({ items }: { items: LegendItem[] }) {
  const t = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: t.spacing.md,
        marginTop: t.spacing.sm,
      }}
    >
      {items.map((item) => (
        <View key={item.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <View
            style={{
              width: 14,
              height: item.dashed ? 0 : 3,
              borderRadius: 2,
              backgroundColor: item.dashed ? undefined : item.color,
              borderTopWidth: item.dashed ? 2 : 0,
              borderColor: item.color,
              borderStyle: item.dashed ? 'dashed' : 'solid',
            }}
          />
          <AppText variant="label" style={{ textTransform: 'none', letterSpacing: 0 }}>
            {item.label}
          </AppText>
        </View>
      ))}
    </View>
  );
}
