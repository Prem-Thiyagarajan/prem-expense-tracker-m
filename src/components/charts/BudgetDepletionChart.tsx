import { useState } from 'react';
import { Pressable, View } from 'react-native';

import type { CategoryBudget } from '@/api/budget';
import { Pager } from '@/components/Pager';
import { AppText } from '@/components/ui';
import { categoryVisual } from '@/lib/categoryVisual';
import { formatINR, formatINRCompact } from '@/lib/format';
import type { Theme } from '@/theme';

// Fixed row columns, so bars and their labels stay aligned across rows.
const EMOJI_W = 18;
const DAYS_W = 62;

/** Minimum axis headroom past the limit, so an on-track bar never fills the track. */
const MIN_SCALE = 1.3;
/** Cap the axis so one runaway category doesn't flatten everyone else. */
const MAX_SCALE = 2.5;

type Row = {
  item: CategoryBudget;
  projected: number;
  ratio: number; // projected ÷ limit
};

/**
 * Where each category *lands* by month-end if it keeps spending at its current
 * rate, measured against its limit. Every bar shares one axis with a dashed
 * limit marker, so "will overshoot" is literally the part that crosses the
 * line — unlike a days-remaining view, where every healthy category collapses
 * into an identical full bar.
 *
 * Projection is linear: `spent ÷ elapsedDays × totalDays`. The backend's own
 * `daysLeft` (days until this category's budget runs dry) rides along on each
 * row, since that's the number you act on when a category is about to blow.
 */
export function BudgetDepletionChart({
  t,
  items,
  elapsedDays,
  totalDays,
}: {
  t: Theme;
  items: CategoryBudget[];
  elapsedDays: number;
  totalDays: number;
}) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const daysLeftInMonth = Math.max(0, totalDays - elapsedDays);

  const rows: Row[] = items
    .map((item) => {
      const projected = elapsedDays > 0 ? (item.spent / elapsedDays) * totalDays : item.spent;
      return { item, projected, ratio: item.budget > 0 ? projected / item.budget : 0 };
    })
    // Worst overshoot first — the rows you need to act on sit at the top.
    .sort((a, b) => b.ratio - a.ratio);

  const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, ...rows.map((r) => r.ratio)));
  const limitX = 100 / scale; // the limit marker's position across the track, in %

  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <AppText variant="label">Projected month-end</AppText>
        <AppText variant="label" tone="muted">
          at current pace
        </AppText>
      </View>

      <View style={{ marginTop: t.spacing.md }}>
        <Pager
          gap={t.spacing.md}
          items={rows.map(({ item, projected, ratio }) => {
          const visual = categoryVisual(item.icon_name, item.categoryName);
          const over = ratio > 1;
          const isOpen = expanded === item.categoryId;

          // Two segments: up to the limit, then the overshoot beyond it.
          const basePct = (Math.min(ratio, 1) / scale) * 100;
          const overPct = over ? ((Math.min(ratio, scale) - 1) / scale) * 100 : 0;

          const depleted = item.remaining <= 0;
          const runsOutThisMonth = !depleted && item.daysLeft > 0 && item.daysLeft < daysLeftInMonth;
          const daysLabel = depleted
            ? 'spent out'
            : runsOutThisMonth
              ? `~${item.daysLeft}d left`
              : 'lasts month';
          const daysColor = depleted || (runsOutThisMonth && item.daysLeft <= 3)
            ? t.semantic.red
            : runsOutThisMonth
              ? t.semantic.warn
              : t.colors.muted;

          return (
            <Pressable
              key={item.categoryId}
              onPress={() => setExpanded((prev) => (prev === item.categoryId ? null : item.categoryId))}
              hitSlop={4}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm }}>
                <AppText style={{ fontSize: 13, width: EMOJI_W }}>{visual.emoji}</AppText>
                <AppText variant="subheading" numberOfLines={1} style={{ flex: 1, fontSize: 11 }}>
                  {item.categoryName}
                </AppText>
                <AppText variant="bodySemi" style={{ fontSize: 11 }} color={over ? t.semantic.red : t.colors.ink}>
                  {formatINRCompact(projected)}
                  <AppText variant="body" tone="muted" style={{ fontSize: 11 }}>
                    {' / '}
                    {formatINRCompact(item.budget)}
                  </AppText>
                </AppText>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm, marginTop: 5 }}>
                <View
                  style={{
                    flex: 1,
                    height: 10,
                    backgroundColor: t.colors.hair,
                    borderRadius: t.radius.pill,
                    borderWidth: t.border.row,
                    borderColor: t.colors.line,
                    overflow: 'hidden',
                    flexDirection: 'row',
                  }}
                >
                  <View style={{ width: `${basePct}%`, height: '100%', backgroundColor: t.candy.mint }} />
                  {overPct > 0 ? (
                    <View style={{ width: `${overPct}%`, height: '100%', backgroundColor: t.semantic.red }} />
                  ) : null}
                  {/* Dashed limit marker — everything right of it is overshoot. */}
                  <View
                    pointerEvents="none"
                    style={{
                      position: 'absolute',
                      left: `${limitX}%`,
                      top: 0,
                      bottom: 0,
                      width: 2,
                      backgroundColor: t.colors.ink,
                      opacity: 0.55,
                    }}
                  />
                </View>

                <AppText variant="bodySemi" color={daysColor} style={{ fontSize: 10, width: DAYS_W, textAlign: 'right' }}>
                  {daysLabel}
                </AppText>
              </View>

              {isOpen ? (
                <View
                  style={{
                    marginTop: 6,
                    marginLeft: EMOJI_W + t.spacing.sm,
                    paddingLeft: t.spacing.sm,
                    borderLeftWidth: t.border.row,
                    borderLeftColor: t.colors.hair,
                  }}
                >
                  <AppText variant="body" tone="muted" style={{ fontSize: 11 }}>
                    {formatINR(item.spent)} spent of {formatINR(item.budget)} ·{' '}
                    {item.remaining > 0 ? `${formatINR(item.remaining)} left` : 'nothing left'}
                  </AppText>
                  <AppText variant="body" tone="muted" style={{ fontSize: 11 }}>
                    {over
                      ? `On pace to overshoot by ${formatINR(projected - item.budget)}`
                      : `On track — about ${formatINR(item.budget - projected)} to spare`}
                  </AppText>
                  <AppText variant="body" tone="muted" style={{ fontSize: 11 }}>
                    {depleted
                      ? 'Budget already used up'
                      : runsOutThisMonth
                        ? `Runs dry in ~${item.daysLeft} ${item.daysLeft === 1 ? 'day' : 'days'}, with ${daysLeftInMonth} left in the month`
                        : 'Should last the rest of the month'}
                  </AppText>
                </View>
              ) : null}
            </Pressable>
          );
          })}
        />
      </View>

      <View style={{ flexDirection: 'row', gap: t.spacing.md, marginTop: t.spacing.md }}>
        <Legend t={t} color={t.candy.mint} label="Within limit" />
        <Legend t={t} color={t.semantic.red} label="Overshoot" />
        <AppText variant="label" tone="muted" style={{ fontSize: 8 }}>
          ┆ limit
        </AppText>
      </View>
    </View>
  );
}

function Legend({ t, color, label }: { t: Theme; color: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      <View
        style={{
          width: 10,
          height: 10,
          borderRadius: 3,
          backgroundColor: color,
          borderWidth: 1.5,
          borderColor: t.colors.ink,
        }}
      />
      <AppText variant="label" tone="muted" style={{ fontSize: 8 }}>
        {label}
      </AppText>
    </View>
  );
}
