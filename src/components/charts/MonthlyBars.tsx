import { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import Svg, { Line, Rect, Text as SvgText } from 'react-native-svg';

import type { MonthlyBreakdownPoint } from '@/api/analytics';
import { AppText } from '@/components/ui';
import { formatINR, formatINRCompact } from '@/lib/format';
import { formatMonthLabel, MONTHS } from '@/lib/month';
import type { Theme } from '@/theme';
import { useChartWidth } from './useChartWidth';

const H = 152; // full SVG height, including the x-axis label gutter
const PAD_TOP = 10;
const X_AXIS_H = 18; // bottom gutter for month labels
const PLOT_L = 38; // left gutter for ₹k labels
const PLOT_R = 6;
const MAX_BAR_W = 34;
const MAX_X_LABELS = 6; // thin labels past this so they never collide

/**
 * Month-by-month totals as candy bars with ink borders. Tap or scrub a bar and
 * the header reads out that month's spend; a dashed line marks the window's
 * mean so an unusual month is obvious at a glance.
 *
 * Only the range periods (`3m`/`6m`/`1y`/`all`) return `monthlyBreakdown` — in
 * single-month mode the backend sends `[]` and the screen shows the day-level
 * composition chart instead.
 */
export function MonthlyBars({ t, data }: { t: Theme; data: MonthlyBreakdownPoint[] }) {
  const { width, onLayout } = useChartWidth();
  const [sel, setSel] = useState<number | null>(null);

  const n = data.length;
  const maxVal = data.reduce((m, p) => Math.max(m, p.spend), 0);
  const mean = n > 0 ? data.reduce((s, p) => s + p.spend, 0) / n : 0;
  const canDraw = width > 0 && n >= 1 && maxVal > 0;

  const plotL = PLOT_L;
  const plotW = width - PLOT_L - PLOT_R;
  const bandW = n > 0 ? plotW / n : 0;

  // Guard against a stale selection when the period (and series length) changes.
  const activeSel = sel != null && sel < n ? sel : null;

  const barAt = useCallback(
    (fx: number) => Math.max(0, Math.min(n - 1, Math.floor((fx - plotL) / bandW))),
    [n, bandW, plotL],
  );

  /** Scrubbing always moves the readout to the bar under the finger. */
  const select = useCallback(
    (fx: number) => {
      if (n < 1 || bandW <= 0) return;
      setSel(barAt(fx));
    },
    [n, bandW, barAt],
  );

  /** Tapping the bar that's already open closes the readout. */
  const toggle = useCallback(
    (fx: number) => {
      if (n < 1 || bandW <= 0) return;
      const i = barAt(fx);
      setSel((prev) => (prev === i ? null : i));
    },
    [n, bandW, barAt],
  );

  const gesture = useMemo(() => {
    // Stationary touch = tap; horizontal drag = scrub. failOffsetY lets a
    // vertical drag fall through to the surrounding ScrollView.
    const tap = Gesture.Tap().onEnd((e) => runOnJS(toggle)(e.x));
    const pan = Gesture.Pan()
      .activeOffsetX([-8, 8])
      .failOffsetY([-10, 10])
      .onUpdate((e) => runOnJS(select)(e.x));
    return Gesture.Race(pan, tap);
  }, [select, toggle]);

  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <AppText variant="label">By month</AppText>
        {activeSel != null ? (
          <AppText variant="label" numberOfLines={1}>
            {formatMonthLabel(data[activeSel].month)} · {formatINR(data[activeSel].spend)}
          </AppText>
        ) : (
          <AppText variant="label" tone="muted">
            avg {formatINR(mean)}
          </AppText>
        )}
      </View>

      <View onLayout={onLayout} style={{ height: H, width: '100%', marginTop: t.spacing.sm }}>
        {canDraw ? (
          <GestureDetector gesture={gesture}>
            <View>
              <BarsSvg t={t} data={data} width={width} maxVal={maxVal} mean={mean} sel={activeSel} />
            </View>
          </GestureDetector>
        ) : null}
      </View>
    </View>
  );
}

function BarsSvg({
  t,
  data,
  width,
  maxVal,
  mean,
  sel,
}: {
  t: Theme;
  data: MonthlyBreakdownPoint[];
  width: number;
  maxVal: number;
  mean: number;
  sel: number | null;
}) {
  const n = data.length;
  const plotTop = PAD_TOP;
  const plotBottom = H - X_AXIS_H;
  const plotH = plotBottom - plotTop;
  const plotL = PLOT_L;
  const plotR = width - PLOT_R;
  const plotW = plotR - plotL;

  const bandW = plotW / n;
  const barW = Math.min(bandW * 0.62, MAX_BAR_W);
  // Headroom above the tallest bar so it never touches the top gridline.
  const scaleMax = maxVal * 1.08;
  const y = (v: number) => plotTop + plotH * (1 - v / scaleMax);

  const grid = [0, 0.5, 1];

  // Thin the month labels evenly so they never overlap on 1y / all windows.
  const labelStep = Math.ceil(n / MAX_X_LABELS);
  const monthShort = (m: string) => MONTHS[Number(m.split('-')[1]) - 1] ?? '';

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

      {data.map((p, i) => {
        const barX = plotL + i * bandW + (bandW - barW) / 2;
        const barY = y(p.spend);
        const selected = sel === i;
        // Sub-pixel bars would vanish under their own border on tiny months.
        const barH = Math.max(2, plotBottom - barY);
        return (
          <Rect
            key={p.month}
            x={barX}
            y={plotBottom - barH}
            width={barW}
            height={barH}
            rx={3}
            fill={selected ? t.candy.coral : t.candy.yellow}
            stroke={t.colors.line}
            strokeWidth={selected ? 2 : 1.5}
          />
        );
      })}

      {/* Window mean — the reference every bar is read against. */}
      {mean > 0 ? (
        <Line
          x1={plotL}
          x2={plotR}
          y1={y(mean)}
          y2={y(mean)}
          stroke={t.colors.ink}
          strokeWidth={1.5}
          strokeOpacity={0.55}
          strokeDasharray="4 4"
        />
      ) : null}

      {data.map((p, i) =>
        i % labelStep === 0 ? (
          <SvgText
            key={`x${p.month}`}
            x={plotL + i * bandW + bandW / 2}
            y={H - 5}
            fontSize={9}
            fill={sel === i ? t.colors.ink : t.colors.muted}
            fontWeight={sel === i ? '700' : '400'}
            textAnchor="middle"
          >
            {monthShort(p.month)}
          </SvgText>
        ) : null,
      )}
    </Svg>
  );
}
