import Svg, { Circle, Defs, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { brand } from '@/theme';

/**
 * The ExpenseTracker app mark: two opposing quarter-discs around a centre dot —
 * money in, money out, and the balance between them.
 *
 * Vector twin of `logo/glyph-lime.svg`; the launcher rasters in `assets/images/`
 * come from the same geometry via `scripts/generate-icons.mjs`. Authored in the
 * 512-unit box the SVG sources use, so path data is copied across verbatim.
 *
 * Per `logo/README.md`: never add outlines, bevels, or shadows to the glyph, and
 * keep the second quadrant lighter than the first.
 */

const VIEW = 512;
/** `glyph-lime.svg` scales the mark up by 1.06 when it stands alone on a field. */
const GLYPH_SCALE = 1.06;
const GLYPH_TRANSFORM = `translate(256 256) scale(${GLYPH_SCALE}) translate(-256 -256)`;

type Props = {
  /** Edge length of the square mark in px. */
  size: number;
  /**
   * `field` — lime on the dark olive tile, the launcher icon look (default).
   * `lime` / `mono` / `ink` — glyph alone on a transparent ground, for callers
   * that supply their own background.
   */
  variant?: 'field' | 'lime' | 'mono' | 'ink';
  /** Overrides the glyph colour for the transparent variants. */
  color?: string;
};

const GLYPH_COLOR: Record<NonNullable<Props['variant']>, string> = {
  field: brand.lime,
  lime: brand.lime,
  mono: brand.mono,
  ink: '#1E1B16',
};

export function AppMark({ size, variant = 'field', color }: Props) {
  const onField = variant === 'field';
  const fill = color ?? GLYPH_COLOR[variant];
  // On the dark tile the mark keeps the master's 62.5% size — the margin is what
  // makes it read. Standing alone it takes the larger glyph scale.
  const transform = onField ? undefined : GLYPH_TRANSFORM;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${VIEW} ${VIEW}`}>
      {onField && (
        <>
          <Defs>
            <LinearGradient id="appMarkField" x1="0" y1="0" x2="0.6" y2="1">
              <Stop offset="0" stopColor={brand.fieldTop} />
              <Stop offset="1" stopColor={brand.fieldBottom} />
            </LinearGradient>
          </Defs>
          <Rect width={VIEW} height={VIEW} fill="url(#appMarkField)" />
        </>
      )}
      <G transform={transform}>
        <Path d="M256 96 A160 160 0 0 1 416 256 H256 Z" fill={fill} />
        {/* The second quadrant must stay lighter than the first — never equal weight. */}
        <Path d="M256 416 A160 160 0 0 1 96 256 H256 Z" fill={fill} fillOpacity={0.6} />
        <Circle cx={256} cy={256} r={34} fill={fill} />
      </G>
    </Svg>
  );
}
