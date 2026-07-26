import { useCallback, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';

import { AppText } from '@/components/ui';
import { Surface } from '@/components/ui/Surface';
import { formatINR, formatINRCompact } from '@/lib/format';
import type { Theme } from '@/theme';
import { ChartLegend } from './ChartLegend';
import { useChartWidth } from './useChartWidth';

const H = 150; // full SVG height, including the x-axis label gutter
const PAD_TOP = 8;
const X_AXIS_H = 18; // bottom gutter for day-of-month labels
const PLOT_L = 38; // left gutter for ₹k labels
const PLOT_R = 6;
const X_TICKS = 5;
const TOOLTIP_W = 138;

/**
 * One line on a DayLineChart. `values` is indexed by day-of-month (index 0 =
 * day 1); a `null` means "no data for that day" and breaks the line rather than
 * drawing through zero — which is what makes the current month's series stop
 * cleanly at today instead of diving to the axis.
 */
export type DaySeries = {
  key: string;
  label: string;
  color: string;
  dashed?: boolean;
  values: (number | null)[];
};

/**
 * A day-of-month line chart carrying any number of series. Scrub or tap and a
 * floating readout compares every series on that day.
 *
 * Two Trends sections share it: spending *velocity* (this month vs last month vs
 * the window's average) and spending *composition* (cumulative small vs large
 * purchases). They're the same chart with different series, so they're the same
 * component — see `SpendTrend` for the single-series dashboard variant.
 */
export function DayLineChart({
  t,
  series,
  days,
  emptyHint,
}: {
  t: Theme;
  series: DaySeries[];
  /** Days on the x-axis — the month's length, or 31 for a padded range series. */
  days: number;
  emptyHint?: string;
}) {
  const { width, onLayout } = useChartWidth();
  const [sel, setSel] = useState<number | null>(null);

  const maxVal = series.reduce(
    (m, s) => s.values.reduce((mm: number, v) => (v == null ? mm : Math.max(mm, v)), m),
    0,
  );
  const canDraw = width > 0 && days > 1 && maxVal > 0;

  const plotL = PLOT_L;
  const plotW = width - PLOT_L - PLOT_R;

  const dayAt = useCallback(
    (fx: number) => {
      const rel = (fx - plotL) / plotW;
      return Math.max(1, Math.min(days, Math.round(rel * (days - 1)) + 1));
    },
    [days, plotL, plotW],
  );

  /** Scrubbing always moves the readout to the day under the finger. */
  const select = useCallback(
    (fx: number) => {
      if (days < 2 || plotW <= 0) return;
      setSel(dayAt(fx));
    },
    [days, plotW, dayAt],
  );

  const gesture = useMemo(() => {
    // Stationary touch = tap; horizontal drag = scrub. failOffsetY lets a
    // vertical drag fall through to the surrounding ScrollView.
    const tap = Gesture.Tap().onEnd((e) => runOnJS(select)(e.x));
    const pan = Gesture.Pan()
      .activeOffsetX([-8, 8])
      .failOffsetY([-10, 10])
      .onUpdate((e) => runOnJS(select)(e.x));
    return Gesture.Race(pan, tap);
  }, [select]);

  // Guard against a stale selection when the period (and day count) changes.
  const activeSel = sel != null && sel <= days ? sel : null;

  const scaleMax = maxVal * 1.08;
  const x = (day: number) => plotL + ((day - 1) / (days - 1)) * plotW;
  const plotTop = PAD_TOP;
  const plotBottom = H - X_AXIS_H;
  const y = (v: number) => plotTop + (plotBottom - plotTop) * (1 - v / scaleMax);

  // Anchor the tooltip to the highest series value on the scrubbed day.
  const topValueAt = (day: number) =>
    series.reduce((m, s) => Math.max(m, s.values[day - 1] ?? 0), 0);

  return (
    <View>
      <View onLayout={onLayout} style={{ height: H, width: '100%' }}>
        {canDraw ? (
          // The readout sits outside the GestureDetector so its own tap target
          // isn't swallowed by the chart's scrub gesture.
          <>
            <GestureDetector gesture={gesture}>
              <View>
                <LinesSvg t={t} series={series} days={days} width={width} scaleMax={scaleMax} sel={activeSel} />
              </View>
            </GestureDetector>
            {activeSel != null ? (
              <Tooltip
                t={t}
                day={activeSel}
                series={series}
                left={Math.max(0, Math.min(width - TOOLTIP_W, x(activeSel) - TOOLTIP_W / 2))}
                top={Math.max(0, y(topValueAt(activeSel)) - 26 - series.length * 15)}
                onDismiss={() => setSel(null)}
              />
            ) : null}
          </>
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <AppText variant="body" tone="muted" style={{ fontSize: 12 }}>
              {emptyHint ?? 'No spending in this period'}
            </AppText>
          </View>
        )}
      </View>

      <ChartLegend items={series.map((s) => ({ label: s.label, color: s.color, dashed: s.dashed }))} />
    </View>
  );
}

/**
 * Floating readout listing every series' value on the scrubbed day. Tapping it
 * dismisses it — a chart has no spare chrome for a close button, so the bubble
 * is its own dismiss target, hinted by the × in its header.
 */
function Tooltip({
  t,
  day,
  series,
  left,
  top,
  onDismiss,
}: {
  t: Theme;
  day: number;
  series: DaySeries[];
  left: number;
  top: number;
  onDismiss: () => void;
}) {
  return (
    <Pressable
      onPress={onDismiss}
      hitSlop={6}
      style={{ position: 'absolute', left, top, width: TOOLTIP_W }}
    >
      <Surface
        backgroundColor={t.colors.card}
        borderWidth={t.border.row}
        radius={t.radius.chip}
        offset={t.shadowOffset.chip}
        style={{ paddingHorizontal: t.spacing.sm, paddingVertical: 6 }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <AppText variant="label">Day {day}</AppText>
          <AppText variant="label" tone="muted" style={{ fontSize: 12, letterSpacing: 0 }}>
            ✕
          </AppText>
        </View>
        {series.map((s) => {
          const v = s.values[day - 1];
          return (
            <View
              key={s.key}
              style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 6, marginTop: 2 }}
            >
              <AppText variant="body" color={s.color} numberOfLines={1} style={{ fontSize: 10, flexShrink: 1 }}>
                {s.label}
              </AppText>
              <AppText variant="bodySemi" style={{ fontSize: 10 }}>
                {v == null ? '—' : formatINR(v)}
              </AppText>
            </View>
          );
        })}
      </Surface>
    </Pressable>
  );
}

/**
 * Split a series into unbroken runs so a `null` day cuts the line instead of
 * interpolating across it. Single-point runs are dropped — an SVG path of one
 * point draws nothing; the selection dot covers that case instead.
 */
function pathFor(
  values: (number | null)[],
  days: number,
  x: (day: number) => number,
  y: (v: number) => number,
): string {
  const runs: string[] = [];
  let current: string[] = [];
  for (let day = 1; day <= days; day++) {
    const v = values[day - 1];
    if (v == null) {
      if (current.length > 1) runs.push(current.join(' '));
      current = [];
      continue;
    }
    current.push(`${current.length === 0 ? 'M' : 'L'}${x(day)},${y(v)}`);
  }
  if (current.length > 1) runs.push(current.join(' '));
  return runs.join(' ');
}

function LinesSvg({
  t,
  series,
  days,
  width,
  scaleMax,
  sel,
}: {
  t: Theme;
  series: DaySeries[];
  days: number;
  width: number;
  scaleMax: number;
  sel: number | null;
}) {
  const plotTop = PAD_TOP;
  const plotBottom = H - X_AXIS_H;
  const plotH = plotBottom - plotTop;
  const plotL = PLOT_L;
  const plotR = width - PLOT_R;
  const plotW = plotR - plotL;

  const x = (day: number) => plotL + ((day - 1) / (days - 1)) * plotW;
  const y = (v: number) => plotTop + plotH * (1 - v / scaleMax);

  const grid = [0, 0.5, 1];
  // Sparse, evenly spaced day ticks across the month (1 · 8 · 15 · 22 · 31).
  const tickDays = Array.from(
    new Set(Array.from({ length: X_TICKS }, (_, k) => Math.round((k / (X_TICKS - 1)) * (days - 1)) + 1)),
  );

  return (
    <Svg width={width} height={H}>
      {grid.map((g) => {
        const gy = plotTop + plotH * g;
        return (
          <Line
            key={`g${g}`}
            x1={plotL}
            x2={plotR}
            y1={gy}
            y2={gy}
            stroke={t.colors.muted}
            strokeWidth={1}
            strokeOpacity={g === 1 ? 0.4 : 0.16}
          />
        );
      })}

      {grid.map((g) => (
        <SvgText
          key={`y${g}`}
          x={plotL - 6}
          y={plotTop + plotH * g + 3}
          fontSize={9}
          fill={t.colors.muted}
          textAnchor="end"
        >
          {formatINRCompact(scaleMax * (1 - g))}
        </SvgText>
      ))}

      {series.map((s) => (
        <Path
          key={s.key}
          d={pathFor(s.values, days, x, y)}
          fill="none"
          stroke={s.color}
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
          strokeDasharray={s.dashed ? '5 4' : undefined}
        />
      ))}

      {/* X-axis: sparse day labels, edges anchored so they don't clip. */}
      {tickDays.map((d) => (
        <SvgText
          key={`x${d}`}
          x={x(d)}
          y={H - 5}
          fontSize={9}
          fill={sel === d ? t.colors.ink : t.colors.muted}
          fontWeight={sel === d ? '700' : '400'}
          textAnchor={d === 1 ? 'start' : d === days ? 'end' : 'middle'}
        >
          {d}
        </SvgText>
      ))}

      {sel != null ? (
        <>
          <Line
            x1={x(sel)}
            x2={x(sel)}
            y1={plotTop}
            y2={plotBottom}
            stroke={t.colors.ink}
            strokeWidth={1.5}
            strokeOpacity={0.35}
            strokeDasharray="3 3"
          />
          {series.map((s) => {
            const v = s.values[sel - 1];
            if (v == null) return null;
            return (
              <Circle
                key={`d${s.key}`}
                cx={x(sel)}
                cy={y(v)}
                r={4.5}
                fill={s.color}
                stroke={t.colors.ink}
                strokeWidth={1.5}
              />
            );
          })}
        </>
      ) : null}
    </Svg>
  );
}
