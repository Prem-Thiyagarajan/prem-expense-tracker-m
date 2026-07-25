import { useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';

import type { CategoryBudget } from '@/api/budget';
import { CategoryBadge } from '@/components/CategoryBadge';
import { AppText, BottomSheet } from '@/components/ui';
import { Surface } from '@/components/ui/Surface';
import { formatINR } from '@/lib/format';
import { useTheme, type Theme } from '@/theme';

const COLUMNS = 3;

type Props = {
  visible: boolean;
  onClose: () => void;
  monthLabel: string;
  items: CategoryBudget[];
};

/**
 * "View all" — every budgeted category as a grid of icon tiles. Tapping a tile
 * flips it to reveal how much of that category's budget is still available, so
 * the whole month can be scanned at a glance without a long scrolling list.
 */
export function BudgetCategoryGridSheet({ visible, onClose, monthLabel, items }: Props) {
  const t = useTheme();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  // Tile size: sheet padding is spacing.lg either side, plus gaps between columns.
  const tileSize =
    (windowWidth - t.spacing.lg * 2 - t.spacing.sm * (COLUMNS - 1)) / COLUMNS;

  return (
    <BottomSheet visible={visible} onClose={onClose} style={{ maxHeight: windowHeight * 0.85 }}>
      <AppText variant="title" style={{ fontSize: 18 }}>
        All categories · {monthLabel}
      </AppText>
      <AppText variant="body" tone="muted" style={{ marginTop: t.spacing.sm }}>
        Tap a category to flip it and see what&rsquo;s left.
      </AppText>

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ flexShrink: 1, marginTop: t.spacing.md }}
        contentContainerStyle={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: t.spacing.sm,
          paddingBottom: t.spacing.sm,
        }}
      >
        {items.map((item) => (
          <FlipTile key={item.categoryId} t={t} item={item} size={tileSize} />
        ))}
      </ScrollView>
    </BottomSheet>
  );
}

function FlipTile({ t, item, size }: { t: Theme; item: CategoryBudget; size: number }) {
  const spin = useRef(new Animated.Value(0)).current;
  const [flipped, setFlipped] = useState(false);

  const flip = () => {
    Animated.timing(spin, {
      toValue: flipped ? 0 : 1,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    setFlipped((f) => !f);
  };

  const availablePct =
    item.budget > 0 ? Math.max(0, Math.min(100, (item.remaining / item.budget) * 100)) : 0;

  // Back-face fill reflects how much room is left, not just the number.
  const backFill =
    item.remaining <= 0 ? t.semantic.red : availablePct < 25 ? t.candy.yellow : t.candy.mint;

  const front = {
    transform: [
      { perspective: 800 },
      { rotateY: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }) },
    ],
    backfaceVisibility: 'hidden' as const,
  };
  const back = {
    ...StyleSheet.absoluteFillObject,
    transform: [
      { perspective: 800 },
      { rotateY: spin.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] }) },
    ],
    backfaceVisibility: 'hidden' as const,
  };

  return (
    <Pressable onPress={flip} style={{ width: size, height: size }}>
      <Animated.View style={[{ width: '100%', height: '100%' }, front]}>
        <Surface
          radius={t.radius.card}
          offset={t.shadowOffset.chip}
          style={{
            width: '100%',
            height: '100%',
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 4,
            gap: 5,
          }}
        >
          <CategoryBadge iconName={item.icon_name} name={item.categoryName} size={32} />
          <AppText variant="subheading" numberOfLines={2} style={{ fontSize: 10, textAlign: 'center' }}>
            {item.categoryName}
          </AppText>
        </Surface>
      </Animated.View>

      <Animated.View style={back} pointerEvents="none">
        <Surface
          backgroundColor={backFill}
          radius={t.radius.card}
          offset={t.shadowOffset.chip}
          style={{
            width: '100%',
            height: '100%',
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 4,
          }}
        >
          <AppText variant="money" color={t.candyText} style={{ fontSize: 22 }}>
            {Math.round(availablePct)}%
          </AppText>
          <AppText variant="label" color={t.candyText} style={{ fontSize: 8, marginTop: 2 }}>
            available
          </AppText>
          <AppText variant="body" color={t.candyText} style={{ fontSize: 9, marginTop: 3, opacity: 0.8 }}>
            {formatINR(item.remaining)}
          </AppText>
        </Surface>
      </Animated.View>
    </Pressable>
  );
}
