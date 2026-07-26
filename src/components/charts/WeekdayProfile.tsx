import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import type { HeatmapPoint } from '@/api/analytics';
import { AppText } from '@/components/ui';
import { formatINR } from '@/lib/format';
import type { Theme } from '@/theme';

const NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const FULL = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'] as const;
const TRACK_H = 108;

type Slot = { index: number; total: number; days: number; average: number };

/**
 * Which days of the week actually cost you money.
 *
 * Built from the same `transactionHeatmap` the calendar uses, but answering a
 * different question — the calendar shows *when* in the month you spent, this
 * shows the weekly rhythm underneath it. Bars are totals; tapping one also
 * reveals the per-occurrence average, which is the fairer comparison when a
 * period doesn't contain equal numbers of each weekday.
 */
export function WeekdayProfile({ t, data }: { t: Theme; data: HeatmapPoint[] }) {
  const [sel, setSel] = useState<number | null>(null);

  const slots = useMemo<Slot[]>(() => {
    const acc = NAMES.map((_, index) => ({ index, total: 0, days: 0, average: 0 }));
    for (const point of data) {
      if (point.spend <= 0) continue;
      // Parse the parts rather than `new Date(key)` — that would read the key as
      // UTC midnight and can land on the previous weekday west of Greenwich.
      const [y, m, d] = point.date.split('-').map(Number);
      const slot = acc[new Date(y, m - 1, d).getDay()];
      slot.total += point.spend;
      slot.days += 1;
    }
    for (const slot of acc) slot.average = slot.days > 0 ? slot.total / slot.days : 0;
    return acc;
  }, [data]);

  const max = slots.reduce((m, s) => Math.max(m, s.total), 0);
  if (max <= 0) return null;

  const peak = slots.reduce((best, s) => (s.total > best.total ? s : best), slots[0]);
  const activeSlot = sel != null ? slots[sel] : null;

  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <AppText variant="label">By weekday</AppText>
        {activeSlot ? (
          <AppText variant="label" numberOfLines={1}>
            {formatINR(activeSlot.total)} over {activeSlot.days}{' '}
            {activeSlot.days === 1 ? 'day' : 'days'}
          </AppText>
        ) : (
          <AppText variant="label" tone="muted">
            tap a bar
          </AppText>
        )}
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          gap: 6,
          height: TRACK_H,
          marginTop: t.spacing.md,
        }}
      >
        {slots.map((slot) => {
          const selected = sel === slot.index;
          const isPeak = slot.index === peak.index;
          // Every weekday keeps a visible stub so an empty day still reads as a
          // day rather than a gap in the row.
          const height = Math.max(4, (slot.total / max) * TRACK_H);
          return (
            <Pressable
              key={slot.index}
              onPress={() => setSel((prev) => (prev === slot.index ? null : slot.index))}
              style={{ flex: 1, justifyContent: 'flex-end' }}
            >
              <View
                style={{
                  height,
                  borderRadius: 6,
                  backgroundColor:
                    slot.total === 0 ? t.colors.hair : isPeak ? t.candy.coral : t.candy.yellow,
                  borderWidth: selected ? 2.5 : t.border.row,
                  borderColor: t.colors.line,
                }}
              />
            </Pressable>
          );
        })}
      </View>

      <View style={{ flexDirection: 'row', gap: 6, marginTop: 5 }}>
        {slots.map((slot) => (
          <AppText
            key={slot.index}
            variant="label"
            tone={sel === slot.index ? 'ink' : 'muted'}
            style={{ flex: 1, textAlign: 'center', letterSpacing: 0 }}
          >
            {NAMES[slot.index]}
          </AppText>
        ))}
      </View>

      <View
        style={{
          marginTop: t.spacing.md,
          paddingTop: t.spacing.sm,
          borderTopWidth: t.border.row,
          borderTopColor: t.colors.hair,
        }}
      >
        {activeSlot ? (
          <AppText variant="bodyMedium" style={{ fontSize: 12 }}>
            {FULL[activeSlot.index]} average{' '}
            <AppText variant="money" style={{ fontSize: 12 }}>
              {formatINR(activeSlot.average)}
            </AppText>{' '}
            per day you spent.
          </AppText>
        ) : (
          <AppText variant="bodyMedium" style={{ fontSize: 12 }}>
            {FULL[peak.index]} cost you the most —{' '}
            <AppText variant="money" style={{ fontSize: 12 }}>
              {formatINR(peak.total)}
            </AppText>{' '}
            across {peak.days} {peak.days === 1 ? 'day' : 'days'}.
          </AppText>
        )}
      </View>
    </View>
  );
}
