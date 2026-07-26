import { useState } from 'react';
import { Pressable, View } from 'react-native';

import type { CategoryDistributionPoint } from '@/api/analytics';
import { AppText } from '@/components/ui';
import { categoryVisual } from '@/lib/categoryVisual';
import { formatINR } from '@/lib/format';
import type { Theme } from '@/theme';

/** Rows shown before the list collapses behind a "+N more" toggle. */
const COLLAPSED_N = 6;

/**
 * "Where it went" — a ranked bar per category, biggest first.
 *
 * Bar widths are relative to the *largest* category, not to the total, so the
 * long tail stays visible instead of collapsing into slivers; the true share of
 * total is spelled out as the percentage next to each amount. Colors come from
 * `categoryVisual()` (CONVENTIONS §1), so a category is the same color here as
 * its badge everywhere else in the app.
 */
export function CategoryBars({ t, data }: { t: Theme; data: CategoryDistributionPoint[] }) {
  const [expanded, setExpanded] = useState(false);

  const ranked = [...data].filter((d) => d.total > 0).sort((a, b) => b.total - a.total);
  if (ranked.length === 0) return null;

  const max = ranked[0].total;
  const shown = expanded ? ranked : ranked.slice(0, COLLAPSED_N);
  const hidden = ranked.length - shown.length;

  return (
    <View style={{ gap: 9 }}>
      {shown.map((d) => (
        <Bar key={d.category} t={t} item={d} widthPct={(d.total / max) * 100} />
      ))}

      {hidden > 0 || expanded ? (
        <Pressable onPress={() => setExpanded((e) => !e)} hitSlop={8} style={{ marginTop: 2 }}>
          <AppText variant="link" style={{ fontSize: 12 }}>
            {expanded ? 'Show less ↑' : `+${hidden} more ↓`}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

function Bar({ t, item, widthPct }: { t: Theme; item: CategoryDistributionPoint; widthPct: number }) {
  const color = categoryVisual(item.icon_name, item.category).color;
  // Sub-1% categories still deserve a visible sliver rather than nothing.
  const share = item.percentage < 1 ? '<1%' : `${Math.round(item.percentage)}%`;

  return (
    <View>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          gap: t.spacing.sm,
        }}
      >
        <AppText variant="heading" numberOfLines={1} style={{ fontSize: 12, flexShrink: 1 }}>
          {item.category}
        </AppText>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 5 }}>
          <AppText variant="money" style={{ fontSize: 12 }}>
            {formatINR(item.total)}
          </AppText>
          <AppText variant="label" tone="muted" style={{ letterSpacing: 0 }}>
            {share}
          </AppText>
        </View>
      </View>

      <View
        style={{
          height: 10,
          marginTop: 4,
          backgroundColor: t.colors.hair,
          borderRadius: t.radius.pill,
          borderWidth: t.border.row,
          borderColor: t.colors.line,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            width: `${Math.max(2, Math.min(100, widthPct))}%`,
            height: '100%',
            backgroundColor: color,
          }}
        />
      </View>
    </View>
  );
}
