import { useCallback, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';

import type { BudgetPacingPoint } from '@/api/budget';
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
const TOOLTIP_W = 124;

/**
 * Actual cumulative spend (solid coral) against the linear "ideal pace" line
 * (dashed) so over/under-pace reads at a glance. Scrub or tap to compare both
 * series on a given day — the floating readout mirrors the web app's tooltip.
 *
 * Ideal pace on day d is `totalBudget * d / daysInMonth` (matches the web app's
 * Budget-vs-Actual chart exactly). The actual line stops at today; the ideal
 * line spans the whole month.
 */
export function BudgetPaceChart({
  t,
  pacingData,
  totalBudget,
  daysInMonthCount,
  elapsedDays,
}: {
  t: Theme;
  pacingData: BudgetPacingPoint[];
  totalBudget: number;
  daysInMonthCount: number;
  elapsedDays: number;
}) {
  const { width, onLayout } = useChartWidth();
  const [sel, setSel] = useState<number | null>(null);

  // The actual series only exists up to today; the backend pads the rest of the
  // month with the running total, which would draw a misleading flat tail.
  const maxDay = Math.max(1, Math.min(elapsedDays, daysInMonthCount));
  const actual = useMemo(() => pacingData.filter((p) => p.day <= maxDay), [pacingData, maxDay]);

  const canDraw = width > 0 && actual.length >= 1 && totalBudget > 0 && daysInMonthCount > 1;

  const plotL = PLOT_L;
  const plotR = width - PLOT_R;
  const plotW = plotR - plotL;

  // Map a finger x-position to the nearest day with actual data.
  const dayAt = useCallback(
    (fx: number) => {
      const rel = (fx - plotL) / plotW;
      return Math.max(1, Math.min(maxDay, Math.round(rel * (daysInMonthCount - 1)) + 1));
    },
    [plotL, plotW, daysInMonthCount, maxDay],
  );

  /** Scrubbing always moves the readout to the day under the finger. */
  const select = useCallback(
    (fx: number) => {
      if (!canDraw) return;
      setSel(dayAt(fx));
    },
    [canDraw, dayAt],
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

  // Guard against a stale selection when the month (and its length) changes.
  const activeSel = sel != null && sel <= maxDay ? sel : null;

  const idealAt = (day: number) => (totalBudget * day) / daysInMonthCount;
  const actualAt = (day: number) => actual.find((p) => p.day === day)?.actualSpend ?? 0;

  const maxActual = actual.reduce((m, p) => Math.max(m, p.actualSpend), 0);
  const maxVal = Math.max(totalBudget, maxActual) * 1.08;

  const x = (day: number) => plotL + ((day - 1) / (daysInMonthCount - 1)) * plotW;
  const plotTop = PAD_TOP;
  const plotBottom = H - X_AXIS_H;
  const y = (v: number) => plotTop + (plotBottom - plotTop) * (1 - v / maxVal);

  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <AppText variant="label">Budget vs actual</AppText>
        <AppText variant="label" tone="muted">
          day {maxDay} / {daysInMonthCount}
        </AppText>
      </View>

      <View onLayout={onLayout} style={{ height: H, width: '100%', marginTop: t.spacing.sm }}>
        {canDraw ? (
          // The tooltip sits outside the GestureDetector so its own tap target
          // isn't swallowed by the chart's scrub gesture.
          <>
            <GestureDetector gesture={gesture}>
              <View>
                <PaceSvg
                  t={t}
                  actual={actual}
                  totalBudget={totalBudget}
                  daysInMonthCount={daysInMonthCount}
                  maxVal={maxVal}
                  width={width}
                  sel={activeSel}
                />
              </View>
            </GestureDetector>
            {activeSel != null ? (
              <Tooltip
                t={t}
                day={activeSel}
                actualValue={actualAt(activeSel)}
                idealValue={idealAt(activeSel)}
                left={Math.max(0, Math.min(width - TOOLTIP_W, x(activeSel) - TOOLTIP_W / 2))}
                top={Math.max(0, y(Math.max(actualAt(activeSel), idealAt(activeSel))) - 62)}
                onDismiss={() => setSel(null)}
              />
            ) : null}
          </>
        ) : null}
      </View>

      <ChartLegend
        items={[
          { label: 'Actual spend', color: t.candy.coral },
          { label: 'Ideal pace', color: t.colors.muted, dashed: true },
        ]}
      />
    </View>
  );
}

/**
 * Floating readout comparing both series on the scrubbed day. Tapping it
 * dismisses it — the bubble is its own dismiss target, hinted by the ×.
 */
function Tooltip({
  t,
  day,
  actualValue,
  idealValue,
  left,
  top,
  onDismiss,
}: {
  t: Theme;
  day: number;
  actualValue: number;
  idealValue: number;
  left: number;
  top: number;
  onDismiss: () => void;
}) {
  const ahead = actualValue > idealValue;
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
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 3 }}>
          <AppText variant="body" color={t.candy.coral} style={{ fontSize: 10 }}>
            Actual
          </AppText>
          <AppText variant="bodySemi" color={ahead ? t.semantic.red : t.colors.ink} style={{ fontSize: 10 }}>
            {formatINR(actualValue)}
          </AppText>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 1 }}>
          <AppText variant="body" tone="muted" style={{ fontSize: 10 }}>
            Ideal
          </AppText>
          <AppText variant="bodySemi" tone="muted" style={{ fontSize: 10 }}>
            {formatINR(idealValue)}
          </AppText>
        </View>
      </Surface>
    </Pressable>
  );
}

function PaceSvg({
  t,
  actual,
  totalBudget,
  daysInMonthCount,
  maxVal,
  width,
  sel,
}: {
  t: Theme;
  actual: BudgetPacingPoint[];
  totalBudget: number;
  daysInMonthCount: number;
  maxVal: number;
  width: number;
  sel: number | null;
}) {
  const plotTop = PAD_TOP;
  const plotBottom = H - X_AXIS_H;
  const plotH = plotBottom - plotTop;
  const plotL = PLOT_L;
  const plotR = width - PLOT_R;
  const plotW = plotR - plotL;

  const x = (day: number) => plotL + ((day - 1) / (daysInMonthCount - 1)) * plotW;
  const y = (v: number) => plotTop + plotH * (1 - v / maxVal);
  const idealAt = (day: number) => (totalBudget * day) / daysInMonthCount;

  const idealPath = `M${x(1)},${y(idealAt(1))} L${x(daysInMonthCount)},${y(totalBudget)}`;
  const actualPath = actual
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.day)},${y(p.actualSpend)}`)
    .join(' ');
  const lastActual = actual[actual.length - 1];

  const grid = [0, 0.5, 1];
  // Sparse, evenly spaced day ticks across the month (1 · 8 · 15 · 22 · 31).
  const tickDays = Array.from(
    new Set(
      Array.from({ length: X_TICKS }, (_, k) =>
        Math.round((k / (X_TICKS - 1)) * (daysInMonthCount - 1)) + 1,
      ),
    ),
  );

  const selActual = sel != null ? actual.find((p) => p.day === sel)?.actualSpend ?? 0 : 0;

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
          {formatINRCompact(maxVal * (1 - g))}
        </SvgText>
      ))}

      <Path d={idealPath} fill="none" stroke={t.colors.muted} strokeWidth={2} strokeDasharray="4 4" />
      <Path
        d={actualPath}
        fill="none"
        stroke={t.candy.coral}
        strokeWidth={2.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* X-axis: sparse day labels, edges anchored so they don't clip. */}
      {tickDays.map((d) => (
        <SvgText
          key={`x${d}`}
          x={x(d)}
          y={H - 5}
          fontSize={9}
          fill={sel === d ? t.colors.ink : t.colors.muted}
          fontWeight={sel === d ? '700' : '400'}
          textAnchor={d === 1 ? 'start' : d === daysInMonthCount ? 'end' : 'middle'}
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
          <Circle cx={x(sel)} cy={y(idealAt(sel))} r={4} fill={t.colors.card} stroke={t.colors.muted} strokeWidth={2} />
          <Circle cx={x(sel)} cy={y(selActual)} r={5} fill={t.candy.coral} stroke={t.colors.ink} strokeWidth={1.5} />
        </>
      ) : (
        <Circle
          cx={x(lastActual.day)}
          cy={y(lastActual.actualSpend)}
          r={4.5}
          fill={t.candy.yellow}
          stroke={t.colors.ink}
          strokeWidth={1.5}
        />
      )}
    </Svg>
  );
}
