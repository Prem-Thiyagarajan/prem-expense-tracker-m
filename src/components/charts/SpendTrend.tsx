import { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';

import { AppText } from '@/components/ui';
import type { TrendPoint } from '@/api/dashboard';
import { formatINR } from '@/lib/format';
import type { Theme } from '@/theme';
import { useChartWidth } from './useChartWidth';

const H = 128; // full SVG height, including the x-axis label gutter
const PAD_TOP = 8;
const X_AXIS_H = 18; // bottom gutter for day-of-month labels
const PLOT_L = 38; // left gutter for ₹k labels
const PLOT_R = 6; // small right breathing room
const X_TICKS = 5; // target number of day labels across the axis

/** Compact ₹k axis label: 0 → "₹0", 11000 → "₹11k", 21744 → "₹22k". */
function kLabel(v: number): string {
  if (v < 1000) return `₹${Math.round(v)}`;
  const k = v / 1000;
  return `₹${k >= 10 ? Math.round(k) : Number(k.toFixed(1))}k`;
}

/**
 * Interactive cumulative-spend line for the month. Scrub a finger across the
 * chart (or tap a day) and the card header reads out that day's running total.
 * X-axis = day of month (sparse ticks), Y-axis = spend (compact ₹k labels).
 *
 * The endpoint returns one cumulative series per month, so this is a single
 * candy-blue area+line — not the web mock's two-line split, which has no
 * backing data in the API.
 */
export function SpendTrend({ t, data, title }: { t: Theme; data: TrendPoint[]; title: string }) {
  const { width, onLayout } = useChartWidth();
  const [sel, setSel] = useState<number | null>(null);

  const n = data.length;
  const maxVal = data.reduce((m, p) => Math.max(m, p.cumulative_spend), 0);
  const canDraw = width > 0 && n >= 2 && maxVal > 0;

  // Guard against a stale selection when the month (and series length) changes.
  const activeSel = sel != null && sel < n ? sel : null;

  // Map a finger x-position to the nearest day index, then select it.
  const select = useCallback(
    (fx: number) => {
      if (n < 2 || width <= 0) return;
      const plotW = width - PLOT_L - PLOT_R;
      const rel = (fx - PLOT_L) / plotW;
      const i = Math.max(0, Math.min(n - 1, Math.round(rel * (n - 1))));
      setSel(i);
    },
    [n, width],
  );

  const gesture = useMemo(() => {
    // A stationary touch is a tap; a horizontal drag is a scrub. failOffsetY
    // lets a vertical drag fall through to the surrounding ScrollView.
    const tap = Gesture.Tap().onEnd((e) => runOnJS(select)(e.x));
    const pan = Gesture.Pan()
      .activeOffsetX([-8, 8])
      .failOffsetY([-10, 10])
      .onUpdate((e) => runOnJS(select)(e.x));
    return Gesture.Race(pan, tap);
  }, [select]);

  return (
    <View>
      {/* Header: title + live readout of the selected day. */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <AppText variant="label">{title}</AppText>
        {activeSel != null ? (
          <AppText variant="label" numberOfLines={1}>
            Day {data[activeSel].day} · {formatINR(data[activeSel].cumulative_spend)}
          </AppText>
        ) : (
          <AppText variant="label" tone="muted">
            cumulative
          </AppText>
        )}
      </View>

      <View onLayout={onLayout} style={{ height: H, width: '100%', marginTop: t.spacing.sm }}>
        {canDraw ? (
          <GestureDetector gesture={gesture}>
            <View>
              <TrendSvg t={t} data={data} width={width} maxVal={maxVal} sel={activeSel} />
            </View>
          </GestureDetector>
        ) : null}
      </View>
    </View>
  );
}

function TrendSvg({
  t,
  data,
  width,
  maxVal,
  sel,
}: {
  t: Theme;
  data: TrendPoint[];
  width: number;
  maxVal: number;
  sel: number | null;
}) {
  const n = data.length;
  const plotTop = PAD_TOP;
  const plotBottom = H - X_AXIS_H;
  const plotH = plotBottom - plotTop;
  const plotL = PLOT_L;
  const plotR = width - PLOT_R;
  const plotW = plotR - plotL;

  const x = (i: number) => plotL + (i / (n - 1)) * plotW;
  const y = (v: number) => plotTop + plotH * (1 - v / maxVal);

  const linePath = data.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(p.cumulative_spend)}`).join(' ');
  const areaPath = `${linePath} L${x(n - 1)},${plotBottom} L${x(0)},${plotBottom} Z`;
  const last = data[n - 1];

  // Three horizontal gridlines; the baseline reads a touch stronger.
  const grid = [0, 0.5, 1];

  // Sparse, evenly spaced day ticks (deduped for short early-month series).
  const tickIdx = Array.from(
    new Set(Array.from({ length: X_TICKS }, (_, k) => Math.round((k / (X_TICKS - 1)) * (n - 1)))),
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

      {/* Y-axis: ₹k label at each gridline (top = max, bottom = 0). */}
      {grid.map((g) => (
        <SvgText
          key={`y${g}`}
          x={plotL - 6}
          y={plotTop + plotH * g + 3}
          fontSize={9}
          fill={t.colors.muted}
          textAnchor="end"
        >
          {kLabel(maxVal * (1 - g))}
        </SvgText>
      ))}

      <Path d={areaPath} fill={t.candy.blue} fillOpacity={0.16} />
      <Path
        d={linePath}
        fill="none"
        stroke={t.candy.blue}
        strokeWidth={2.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* X-axis: sparse day-of-month labels, edges anchored to avoid clipping. */}
      {tickIdx.map((i) => (
        <SvgText
          key={`x${i}`}
          x={x(i)}
          y={H - 5}
          fontSize={9}
          fill={sel === i ? t.colors.ink : t.colors.muted}
          fontWeight={sel === i ? '700' : '400'}
          textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}
        >
          {data[i].day}
        </SvgText>
      ))}

      {/* Selection marker: vertical guide + dot at the scrubbed day. */}
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
          <Circle
            cx={x(sel)}
            cy={y(data[sel].cumulative_spend)}
            r={5}
            fill={t.candy.blue}
            stroke={t.colors.ink}
            strokeWidth={1.5}
          />
        </>
      ) : (
        <Circle
          cx={x(n - 1)}
          cy={y(last.cumulative_spend)}
          r={4}
          fill={t.candy.blue}
          stroke={t.colors.ink}
          strokeWidth={1.5}
        />
      )}
    </Svg>
  );
}
