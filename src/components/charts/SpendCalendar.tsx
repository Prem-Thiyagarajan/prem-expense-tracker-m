import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import type { HeatmapPoint } from '@/api/analytics';
import { AppText } from '@/components/ui';
import { formatDayHeader, formatINR } from '@/lib/format';
import { daysInMonth } from '@/lib/month';
import type { Theme } from '@/theme';
import { useChartWidth } from './useChartWidth';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;
const GAP = 5;

/**
 * Heat steps as alpha over the candy blue. The top two read as a solid candy
 * fill, so they carry ink text like any other candy surface (CONVENTIONS §2).
 */
const STEPS = [0.22, 0.4, 0.58, 0.78, 1] as const;
const INK_ON_CANDY_FROM = 3; // index into STEPS

/** Candy blue (#5C7CFA) at a given alpha, for the heat ramp. */
function heat(alpha: number): string {
  return `rgba(92,124,250,${alpha})`;
}

type Cell = { key: string; day?: number; date?: string; spend?: number };

/**
 * The spending calendar: one square per day of the month, tinted by how much
 * was spent. Tap a day and the header reads out the date and amount.
 *
 * Intensity is scaled against 75% of the month's peak day (matching the web
 * app), so a single outlier doesn't flatten every other day to the palest tint.
 * Days the API didn't return simply had no spend — they render as empty wells.
 */
export function SpendCalendar({ t, data, month }: { t: Theme; data: HeatmapPoint[]; month: string }) {
  const { width, onLayout } = useChartWidth();
  const [sel, setSel] = useState<string | null>(null);

  const spendByDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of data) map.set(p.date, p.spend);
    return map;
  }, [data]);

  const cells = useMemo<Cell[]>(() => {
    const [y, m] = month.split('-').map(Number);
    const total = daysInMonth(month);
    const leading = new Date(y, m - 1, 1).getDay(); // 0 = Sunday

    const out: Cell[] = [];
    for (let i = 0; i < leading; i++) out.push({ key: `pad-${i}` });
    for (let day = 1; day <= total; day++) {
      const date = `${month}-${String(day).padStart(2, '0')}`;
      out.push({ key: date, day, date, spend: spendByDate.get(date) ?? 0 });
    }
    return out;
  }, [month, spendByDate]);

  const max = useMemo(() => data.reduce((m, p) => Math.max(m, p.spend), 0), [data]);
  // Scale against 75% of the peak; anything at or above it saturates.
  const ceiling = max * 0.75;

  const size = width > 0 ? (width - GAP * 6) / 7 : 0;

  // Guard against a selection left over from a month the user has paged away
  // from — the dates are keyed `YYYY-MM-DD`, so the prefix settles it.
  const activeSel = sel != null && sel.startsWith(`${month}-`) ? sel : null;
  const selSpend = activeSel != null ? spendByDate.get(activeSel) ?? 0 : 0;

  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <AppText variant="label">By day</AppText>
        {activeSel ? (
          <AppText variant="label" numberOfLines={1}>
            {formatDayHeader(activeSel)} · {formatINR(selSpend)}
          </AppText>
        ) : (
          <AppText variant="label" tone="muted">
            darker = pricier
          </AppText>
        )}
      </View>

      <View style={{ flexDirection: 'row', gap: GAP, marginTop: t.spacing.sm }}>
        {WEEKDAYS.map((d, i) => (
          <AppText key={i} variant="label" tone="faint" style={{ flex: 1, textAlign: 'center' }}>
            {d}
          </AppText>
        ))}
      </View>

      <View
        onLayout={onLayout}
        style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GAP, marginTop: GAP }}
      >
        {size > 0
          ? cells.map((cell) =>
              cell.day == null ? (
                <View key={cell.key} style={{ width: size, height: size }} />
              ) : (
                <DayCell
                  key={cell.key}
                  t={t}
                  size={size}
                  day={cell.day}
                  spend={cell.spend ?? 0}
                  ceiling={ceiling}
                  selected={activeSel === cell.date}
                  onPress={() => setSel((prev) => (prev === cell.date ? null : cell.date!))}
                />
              ),
            )
          : null}
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          alignSelf: 'flex-end',
          gap: 4,
          marginTop: t.spacing.sm,
        }}
      >
        <AppText variant="label" tone="faint">
          less
        </AppText>
        {STEPS.map((a) => (
          <View
            key={a}
            style={{
              width: 11,
              height: 11,
              borderRadius: 3,
              backgroundColor: heat(a),
              borderWidth: 1,
              borderColor: t.colors.line,
            }}
          />
        ))}
        <AppText variant="label" tone="faint">
          more
        </AppText>
      </View>
    </View>
  );
}

function DayCell({
  t,
  size,
  day,
  spend,
  ceiling,
  selected,
  onPress,
}: {
  t: Theme;
  size: number;
  day: number;
  spend: number;
  ceiling: number;
  selected: boolean;
  onPress: () => void;
}) {
  const hasSpend = spend > 0 && ceiling > 0;
  const step = hasSpend
    ? Math.min(STEPS.length - 1, Math.floor((spend / ceiling) * STEPS.length))
    : -1;

  const background = step >= 0 ? heat(STEPS[step]) : t.colors.hair;
  const textColor = step >= INK_ON_CANDY_FROM ? t.candyText : t.colors.ink;

  return (
    <Pressable
      onPress={onPress}
      style={{
        width: size,
        height: size,
        borderRadius: 7,
        backgroundColor: background,
        borderWidth: selected ? 2.5 : t.border.row,
        borderColor: hasSpend || selected ? t.colors.line : t.colors.hair,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <AppText variant="bodySemi" color={textColor} style={{ fontSize: 10 }}>
        {day}
      </AppText>
    </Pressable>
  );
}
