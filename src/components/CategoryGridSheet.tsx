import { ScrollView, useWindowDimensions, View } from 'react-native';

import type { Category } from '@/api/categories';
import { AppText } from '@/components/ui';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { PressableSurface } from '@/components/ui/Surface';
import { categoryVisual } from '@/lib/categoryVisual';
import { useTheme, type Theme } from '@/theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  categories: Category[];
  /** category_id → number of transactions this month (for the cell subtitle). */
  counts: Map<number, number>;
  total: number; // total transactions this month (for the "All" cell)
  selectedId: number | null;
  onSelect: (id: number | null) => void;
};

/**
 * Category picker for filtering the Expenses list — a 2-column grid of emoji
 * dot · name · this-month count, opened by the ⊞ All chip. Tapping a cell
 * filters; the first "All categories" cell clears the filter. Selecting closes
 * the sheet.
 */
export function CategoryGridSheet({
  visible,
  onClose,
  categories,
  counts,
  total,
  selectedId,
  onSelect,
}: Props) {
  const t = useTheme();
  const { height } = useWindowDimensions();

  const pick = (id: number | null) => {
    onSelect(id);
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <AppText variant="title" style={{ marginBottom: t.spacing.md }}>
        Filter by category
      </AppText>
      <ScrollView
        style={{ maxHeight: height * 0.52 }}
        contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm, paddingBottom: t.spacing.sm }}
        showsVerticalScrollIndicator={false}
      >
        <GridCell
          t={t}
          emoji="🗂️"
          color={t.colors.hair}
          name="All categories"
          count={total}
          selected={selectedId == null}
          onPress={() => pick(null)}
        />
        {categories.map((c) => {
          const visual = categoryVisual(c.icon_name, c.name);
          return (
            <GridCell
              key={c.id}
              t={t}
              emoji={visual.emoji}
              color={visual.color}
              name={c.name}
              count={counts.get(c.id) ?? 0}
              selected={selectedId === c.id}
              onPress={() => pick(c.id)}
            />
          );
        })}
      </ScrollView>
    </BottomSheet>
  );
}

function GridCell({
  t,
  emoji,
  color,
  name,
  count,
  selected,
  onPress,
}: {
  t: Theme;
  emoji: string;
  color: string;
  name: string;
  count: number;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <PressableSurface
      onPress={onPress}
      offset={selected ? t.shadowOffset.chip : 0}
      borderWidth={t.border.row}
      borderColor={selected ? t.colors.ink : t.colors.line}
      backgroundColor={selected ? color : t.colors.card}
      radius={t.radius.card}
      style={{ width: '47.5%' }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: t.spacing.sm,
          padding: t.spacing.md,
        }}
      >
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            backgroundColor: color,
            borderWidth: t.border.row,
            borderColor: t.colors.ink,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AppText style={{ fontSize: 16 }}>{emoji}</AppText>
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="bodySemi" numberOfLines={1} style={{ fontSize: 13 }}>
            {name}
          </AppText>
          <AppText variant="body" tone="muted" style={{ fontSize: 11 }}>
            {count} {count === 1 ? 'txn' : 'txns'}
          </AppText>
        </View>
      </View>
    </PressableSurface>
  );
}
