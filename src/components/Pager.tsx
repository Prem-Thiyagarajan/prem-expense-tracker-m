import { useState } from 'react';
import { ScrollView, View } from 'react-native';

// Direct module path, not the charts barrel: BudgetDepletionChart imports this
// component, and going through the barrel would make that import circular.
import { useChartWidth } from '@/components/charts/useChartWidth';
import { useTheme } from '@/theme';

type Props = {
  /** Rendered items, chunked into pages of `pageSize`. */
  items: React.ReactNode[];
  /** How many items per page. Default 3. */
  pageSize?: number;
  /** Vertical gap between items within a page. Defaults to spacing.sm. */
  gap?: number;
};

/**
 * Horizontally paged stack: shows `pageSize` items at a time and swipes to the
 * next group, so a long category list doesn't stretch the screen. Page dots
 * only appear when there's more than one page.
 *
 * Paging is horizontal on purpose — a nested *vertical* scroller would fight
 * the screen's own ScrollView for the same gesture.
 */
export function Pager({ items, pageSize = 3, gap }: Props) {
  const t = useTheme();
  const { width, onLayout } = useChartWidth();
  const [page, setPage] = useState(0);

  const pages: React.ReactNode[][] = [];
  for (let i = 0; i < items.length; i += pageSize) {
    pages.push(items.slice(i, i + pageSize));
  }

  const rowGap = gap ?? t.spacing.sm;

  // Render un-paged until measured, so the first paint isn't a blank strip.
  if (width <= 0) {
    return (
      <View onLayout={onLayout} style={{ gap: rowGap }}>
        {items.slice(0, pageSize)}
      </View>
    );
  }

  return (
    <View onLayout={onLayout}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
      >
        {pages.map((group, i) => (
          <View key={i} style={{ width, gap: rowGap }}>
            {group}
          </View>
        ))}
      </ScrollView>

      {pages.length > 1 ? (
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 6,
            marginTop: t.spacing.sm,
          }}
        >
          {pages.map((_, i) => (
            <View
              key={i}
              style={{
                width: i === page ? 18 : 6,
                height: 6,
                borderRadius: t.radius.pill,
                backgroundColor: i === page ? t.colors.ink : t.colors.hair,
                borderWidth: i === page ? 0 : 1,
                borderColor: t.colors.hair,
              }}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}
