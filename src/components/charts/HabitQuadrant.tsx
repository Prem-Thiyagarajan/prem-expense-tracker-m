import { useCallback, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import Svg, { Circle, Line, Rect, Text as SvgText } from 'react-native-svg';

import type { HabitPoint } from '@/api/analytics';
import { AppText } from '@/components/ui';
import { Surface } from '@/components/ui/Surface';
import { categoryVisual } from '@/lib/categoryVisual';
import { formatINR, formatINRCompact } from '@/lib/format';
import type { Theme } from '@/theme';
import { useChartWidth } from './useChartWidth';

const H = 186;
const PAD_TOP = 8;
const X_AXIS_H = 18;
const PLOT_L = 38;
const PLOT_R = 6;
const HEADROOM = 1.14; // domain padding so dots never sit on the frame
const TOOLTIP_W = 150;
const TAP_RADIUS = 30; // px within which a tap counts as hitting a dot
const QUADRANT_FILL = 0.32;

/**
 * Spending habit identifier — every category placed by average cost (y) against
 * how often you buy it (x), with the dot's area scaled to total spend.
 *
 * The quadrant split is the *mean* of each axis across categories (matching the
 * web app's reference lines), which turns the chart into a diagnosis: top-right
 * is expensive *and* frequent — the thing actually draining the month — while
 * bottom-right is the cheap-but-constant habit. Tap a dot for its numbers.
 *
 * `habitIdentifier` rows carry no `icon_name`, so dot colors come from an
 * icon lookup the screen builds off `categoryDistribution` — both sections are
 * grouped by category name over the same query, so the names line up.
 */
export function HabitQuadrant({
  t,
  data,
  iconByCategory,
}: {
  t: Theme;
  data: HabitPoint[];
  iconByCategory?: Map<string, string | null>;
}) {
  const { width, onLayout } = useChartWidth();
  const [sel, setSel] = useState<string | null>(null);

  const points = useMemo(() => data.filter((d) => d.transaction_count > 0), [data]);

  const maxX = points.reduce((m, p) => Math.max(m, p.transaction_count), 0) * HEADROOM;
  const maxY = points.reduce((m, p) => Math.max(m, p.average_spend), 0) * HEADROOM;
  const maxTotal = points.reduce((m, p) => Math.max(m, p.total_spend), 0);
  const meanX = points.length ? points.reduce((s, p) => s + p.transaction_count, 0) / points.length : 0;
  const meanY = points.length ? points.reduce((s, p) => s + p.average_spend, 0) / points.length : 0;

  const canDraw = width > 0 && points.length > 0 && maxX > 0 && maxY > 0;

  const plotTop = PAD_TOP;
  const plotBottom = H - X_AXIS_H;
  const plotL = PLOT_L;
  const plotR = width - PLOT_R;

  const x = useCallback(
    (v: number) => plotL + (v / maxX) * (plotR - plotL),
    [plotL, plotR, maxX],
  );
  const y = useCallback(
    (v: number) => plotTop + (1 - v / maxY) * (plotBottom - plotTop),
    [plotTop, plotBottom, maxY],
  );

  // Pick the nearest dot to the touch, but only if it's actually close — a tap
  // on empty chart area clears the selection instead of snapping somewhere odd.
  const selectNearest = useCallback(
    (fx: number, fy: number) => {
      if (!canDraw) return;
      let best: { key: string; d: number } | null = null;
      for (const p of points) {
        const dx = x(p.transaction_count) - fx;
        const dy = y(p.average_spend) - fy;
        const d = Math.hypot(dx, dy);
        if (best == null || d < best.d) best = { key: p.category, d };
      }
      setSel(best && best.d <= TAP_RADIUS ? best.key : null);
    },
    [canDraw, points, x, y],
  );

  const gesture = useMemo(
    () => Gesture.Tap().onEnd((e) => runOnJS(selectNearest)(e.x, e.y)),
    [selectNearest],
  );

  const selected = sel != null ? points.find((p) => p.category === sel) ?? null : null;

  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <AppText variant="label">Cost × frequency</AppText>
        <AppText variant="label" tone="muted">
          size = total spend
        </AppText>
      </View>

      <View onLayout={onLayout} style={{ height: H, width: '100%', marginTop: t.spacing.sm }}>
        {canDraw ? (
          // The tooltip sits outside the GestureDetector so its own tap target
          // isn't swallowed by the chart's tap gesture.
          <>
            <GestureDetector gesture={gesture}>
              <View>
                <QuadrantSvg
                  t={t}
                  points={points}
                  width={width}
                  maxX={maxX}
                  maxY={maxY}
                  maxTotal={maxTotal}
                  meanX={meanX}
                  meanY={meanY}
                  sel={sel}
                  iconByCategory={iconByCategory}
                />
              </View>
            </GestureDetector>
            {selected ? (
              <Tooltip
                t={t}
                point={selected}
                left={Math.max(
                  0,
                  Math.min(width - TOOLTIP_W, x(selected.transaction_count) - TOOLTIP_W / 2),
                )}
                top={Math.max(0, y(selected.average_spend) - 74)}
                onDismiss={() => setSel(null)}
              />
            ) : null}
          </>
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <AppText variant="body" tone="muted" style={{ fontSize: 12 }}>
              No categorised spending in this period
            </AppText>
          </View>
        )}
      </View>

      <AppText variant="label" tone="muted" style={{ marginTop: t.spacing.xs, letterSpacing: 0.6 }}>
        ↑ avg cost · transactions →
      </AppText>

      {/* The quadrant key lives under the plot rather than floating inside it —
          in-chart callouts sat on top of the dots and hid the data. */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm, marginTop: t.spacing.sm }}>
        <QuadrantKey t={t} color={t.candy.coral} label="⚠ Pricey & frequent" />
        <QuadrantKey t={t} color={t.candy.blue} label="Cheap & frequent — habits" />
        <QuadrantKey t={t} color={t.candy.yellow} label="Pricey & rare" />
        <QuadrantKey t={t} color={t.candy.mint} label="Cheap & rare" />
      </View>
    </View>
  );
}

/** One swatch + caption in the quadrant key. */
function QuadrantKey({ t, color, label }: { t: Theme; color: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      <View
        style={{
          width: 10,
          height: 10,
          borderRadius: 3,
          backgroundColor: color,
          borderWidth: 1.5,
          borderColor: t.colors.line,
        }}
      />
      <AppText variant="label" style={{ textTransform: 'none', letterSpacing: 0 }}>
        {label}
      </AppText>
    </View>
  );
}

/** Tapping the bubble dismisses it, hinted by the × in its header. */
function Tooltip({
  t,
  point,
  left,
  top,
  onDismiss,
}: {
  t: Theme;
  point: HabitPoint;
  left: number;
  top: number;
  onDismiss: () => void;
}) {
  const rows: [string, string][] = [
    ['Transactions', String(point.transaction_count)],
    ['Avg cost', formatINR(point.average_spend)],
    ['Total', formatINR(point.total_spend)],
  ];
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
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
          <AppText variant="heading" numberOfLines={1} style={{ fontSize: 12, flexShrink: 1 }}>
            {point.category}
          </AppText>
          <AppText variant="label" tone="muted" style={{ fontSize: 12, letterSpacing: 0 }}>
            ✕
          </AppText>
        </View>
        {rows.map(([k, v]) => (
          <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 6, marginTop: 2 }}>
            <AppText variant="body" tone="muted" style={{ fontSize: 10 }}>
              {k}
            </AppText>
            <AppText variant="bodySemi" style={{ fontSize: 10 }}>
              {v}
            </AppText>
          </View>
        ))}
      </Surface>
    </Pressable>
  );
}

function QuadrantSvg({
  t,
  points,
  width,
  maxX,
  maxY,
  maxTotal,
  meanX,
  meanY,
  sel,
  iconByCategory,
}: {
  t: Theme;
  points: HabitPoint[];
  width: number;
  maxX: number;
  maxY: number;
  maxTotal: number;
  meanX: number;
  meanY: number;
  sel: string | null;
  iconByCategory?: Map<string, string | null>;
}) {
  const plotTop = PAD_TOP;
  const plotBottom = H - X_AXIS_H;
  const plotL = PLOT_L;
  const plotR = width - PLOT_R;

  const x = (v: number) => plotL + (v / maxX) * (plotR - plotL);
  const y = (v: number) => plotTop + (1 - v / maxY) * (plotBottom - plotTop);

  const splitX = x(meanX);
  const splitY = y(meanY);

  // Area ∝ total spend, so the radius follows its square root.
  const radius = (total: number) => 5 + 6 * Math.sqrt(maxTotal > 0 ? total / maxTotal : 0);

  return (
    <Svg width={width} height={H}>
      {/* Quadrant washes: cheap+rare is calm mint, expensive+frequent is coral. */}
      <Rect x={plotL} y={plotTop} width={splitX - plotL} height={splitY - plotTop} fill={t.candy.yellow} fillOpacity={QUADRANT_FILL} />
      <Rect x={splitX} y={plotTop} width={plotR - splitX} height={splitY - plotTop} fill={t.candy.coral} fillOpacity={QUADRANT_FILL} />
      <Rect x={plotL} y={splitY} width={splitX - plotL} height={plotBottom - splitY} fill={t.candy.mint} fillOpacity={QUADRANT_FILL} />
      <Rect x={splitX} y={splitY} width={plotR - splitX} height={plotBottom - splitY} fill={t.candy.blue} fillOpacity={QUADRANT_FILL} />

      {/* Frame: left + bottom axes only, as in the design. */}
      <Line x1={plotL} x2={plotL} y1={plotTop} y2={plotBottom} stroke={t.colors.line} strokeWidth={1.5} />
      <Line x1={plotL} x2={plotR} y1={plotBottom} y2={plotBottom} stroke={t.colors.line} strokeWidth={1.5} />

      {/* The means that define the quadrants. */}
      <Line x1={splitX} x2={splitX} y1={plotTop} y2={plotBottom} stroke={t.colors.ink} strokeWidth={1.5} strokeOpacity={0.5} strokeDasharray="4 4" />
      <Line x1={plotL} x2={plotR} y1={splitY} y2={splitY} stroke={t.colors.ink} strokeWidth={1.5} strokeOpacity={0.5} strokeDasharray="4 4" />

      {/* Y ticks: top of range and the mean. */}
      <SvgText x={plotL - 6} y={plotTop + 8} fontSize={9} fill={t.colors.muted} textAnchor="end">
        {formatINRCompact(maxY)}
      </SvgText>
      <SvgText x={plotL - 6} y={splitY + 3} fontSize={9} fill={t.colors.muted} textAnchor="end">
        {formatINRCompact(meanY)}
      </SvgText>

      {/* X ticks: the mean and the busiest category. */}
      <SvgText x={splitX} y={H - 5} fontSize={9} fill={t.colors.muted} textAnchor="middle">
        {Math.round(meanX)}
      </SvgText>
      <SvgText x={plotR} y={H - 5} fontSize={9} fill={t.colors.muted} textAnchor="end">
        {Math.round(maxX)} txns
      </SvgText>

      {points.map((p) => {
        const selected = sel === p.category;
        return (
          <Circle
            key={p.category}
            cx={x(p.transaction_count)}
            cy={y(p.average_spend)}
            r={radius(p.total_spend)}
            fill={categoryVisual(iconByCategory?.get(p.category), p.category).color}
            stroke={t.colors.line}
            strokeWidth={selected ? 2.5 : 1.5}
          />
        );
      })}
    </Svg>
  );
}
