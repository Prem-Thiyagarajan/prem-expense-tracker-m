import { useState } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

import { AppText } from '@/components/ui';
import { formatINR } from '@/lib/format';
import type { Theme } from '@/theme';

const SIZE = 112;
const STROKE = 22;
const R = (SIZE - STROKE) / 2 - 2; // pull in so the outer ink ring fits
const CX = SIZE / 2;
const CY = SIZE / 2;

const TOP_N = 4; // named slices before everything else folds into "Rest"

// Positional palette (matches the design's "Category distribution" ring order).
// Slices are colored by rank, not category identity, so adjacent slices always
// stay distinct — the legend maps color → category name.
const PALETTE = ['#5C7CFA', '#FF8787', '#FFD43B', '#C7F0DB', '#D0BFFF', '#E8E2D4'];

type Datum = { category: string; amount: number };
type Child = { label: string; pct: number };
type Slice = { label: string; color: string; pct: number; children?: Child[] };

/**
 * Donut of category share-of-total spend. Shows the top 4 categories by name;
 * when there are more, the remainder folds into a single "Rest" slice so the
 * ring stays legible. The "Rest" legend row is tappable — it expands inline to
 * reveal the bundled categories and their shares, keeping the default view
 * uncluttered. The ring always reads as 100% of the month's spend, with the
 * total in the center hole.
 */
export function CategoryDonut({
  t,
  data,
  total,
  centerLabel,
}: {
  t: Theme;
  data: Datum[];
  total: number;
  centerLabel?: string;
}) {
  const [expanded, setExpanded] = useState(false);

  if (total <= 0 || data.length === 0) return null;

  const namedTotal = data.reduce((s, d) => s + d.amount, 0);
  const untracked = total - namedTotal; // categories the API didn't return / uncategorized
  const restMin = total * 0.005;

  let slices: Slice[];

  if (data.length > TOP_N) {
    // Top 4 by name, everything else (plus any untracked remainder) → "Rest".
    const big = data.slice(0, TOP_N);
    const rest = data.slice(TOP_N);
    const restAmount = total - big.reduce((s, d) => s + d.amount, 0);

    const children: Child[] = rest.map((d) => ({ label: d.category, pct: d.amount / total }));
    if (untracked > restMin) children.push({ label: 'Other', pct: untracked / total });

    slices = [
      ...big.map((d, i) => ({ label: d.category, color: PALETTE[i], pct: d.amount / total })),
      { label: 'Rest', color: PALETTE[TOP_N], pct: restAmount / total, children },
    ];
  } else {
    // Few enough to show every category; surface the untracked remainder too.
    const parts: Datum[] = [...data];
    if (untracked > restMin) parts.push({ category: 'Other', amount: untracked });
    slices = parts.map((d, i) => ({
      label: d.category,
      color: PALETTE[i % PALETTE.length],
      pct: d.amount / total,
    }));
  }

  const circumference = 2 * Math.PI * R;
  let acc = 0; // running arc length so each slice starts where the last ended

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: t.spacing.lg }}>
      <View style={{ width: SIZE, height: SIZE }}>
        <Svg width={SIZE} height={SIZE}>
          {/* Rotate so slices begin at 12 o'clock. */}
          <G rotation={-90} originX={CX} originY={CY}>
            <Circle cx={CX} cy={CY} r={R + STROKE / 2} fill="none" stroke={t.colors.ink} strokeWidth={1.5} />
            <Circle cx={CX} cy={CY} r={R - STROKE / 2} fill="none" stroke={t.colors.ink} strokeWidth={1.5} />
            {slices.map((s, i) => {
              const len = s.pct * circumference;
              const el = (
                <Circle
                  key={i}
                  cx={CX}
                  cy={CY}
                  r={R}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={STROKE}
                  strokeDasharray={`${len} ${circumference - len}`}
                  strokeDashoffset={-acc}
                />
              );
              acc += len;
              return el;
            })}
          </G>
        </Svg>
        {/* Center hole label overlaid on the transparent ring center. */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AppText variant="money" style={{ fontSize: 13 }} numberOfLines={1}>
            {formatINR(total)}
          </AppText>
          {centerLabel ? (
            <AppText variant="label" style={{ fontSize: 8, marginTop: 1 }}>
              {centerLabel}
            </AppText>
          ) : null}
        </View>
      </View>

      {/* Legend: color dot · category · share. "Rest" expands inline on tap. */}
      <View style={{ flex: 1, gap: 6 }}>
        {slices.map((s, i) =>
          s.children ? (
            <View key={i}>
              <Pressable
                onPress={() => setExpanded((e) => !e)}
                hitSlop={6}
                style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm }}
              >
                <Dot color={s.color} t={t} />
                <AppText variant="bodySemi" numberOfLines={1} style={{ fontSize: 12 }}>
                  {s.label}
                </AppText>
                <AppText variant="body" tone="muted" style={{ fontSize: 10 }}>
                  {expanded ? '▾' : '▸'}
                </AppText>
                <View style={{ flex: 1 }} />
                <AppText variant="bodySemi" tone="muted" style={{ fontSize: 12 }}>
                  {Math.round(s.pct * 100)}%
                </AppText>
              </Pressable>

              {expanded ? (
                <View style={{ marginTop: 6, marginLeft: 4, gap: 5 }}>
                  {s.children.map((c, j) => (
                    <View
                      key={j}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: t.spacing.sm,
                        borderLeftWidth: 1.5,
                        borderLeftColor: t.colors.hair,
                        paddingLeft: t.spacing.sm,
                      }}
                    >
                      <Dot color={s.color} t={t} small />
                      <AppText variant="body" numberOfLines={1} style={{ flex: 1, fontSize: 11 }}>
                        {c.label}
                      </AppText>
                      <AppText variant="body" tone="muted" style={{ fontSize: 11 }}>
                        {c.pct * 100 < 1 ? '<1' : Math.round(c.pct * 100)}%
                      </AppText>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          ) : (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm }}>
              <Dot color={s.color} t={t} />
              <AppText variant="bodySemi" numberOfLines={1} style={{ flex: 1, fontSize: 12 }}>
                {s.label}
              </AppText>
              <AppText variant="bodySemi" tone="muted" style={{ fontSize: 12 }}>
                {Math.round(s.pct * 100)}%
              </AppText>
            </View>
          ),
        )}
      </View>
    </View>
  );
}

/** Legend swatch — an ink-outlined color chip; `small` for nested Rest rows. */
function Dot({ color, t, small }: { color: string; t: Theme; small?: boolean }) {
  const d = small ? 8 : 10;
  return (
    <View
      style={{
        width: d,
        height: d,
        borderRadius: small ? 2 : 3,
        backgroundColor: color,
        borderWidth: 1.5,
        borderColor: t.colors.ink,
        opacity: small ? 0.85 : 1,
      }}
    />
  );
}
