/**
 * Expense Tracker design tokens — transcribed from the design handoff (README.md §Design Tokens).
 * Playful sticker aesthetic: cream bg, 2px ink borders, hard offset shadows, candy cards.
 */

// ── Neutral palettes ────────────────────────────────────────────────────────
export type Palette = {
  bg: string; // screen background (warm cream)
  card: string; // neutral cards, inputs
  ink: string; // primary text, borders
  line: string; // all borders (2px cards / 1.5px chips & rows)
  shadow: string; // hard offset shadows
  muted: string; // secondary text
  faint: string; // tertiary text
  hair: string; // progress tracks, dividers, filled wells
  link: string; // links, "View all", hints
  nav: string; // bottom tab bar background
  scrim: string; // sheet scrim
};

export const lightColors: Palette = {
  bg: '#FFF8ED',
  card: '#FFFFFF',
  ink: '#1E1B16',
  line: '#1E1B16',
  shadow: '#1E1B16',
  muted: '#9B948A',
  faint: '#B9B2A6',
  hair: '#F3EDDF',
  link: '#5C7CFA',
  nav: '#FFFFFF',
  scrim: 'rgba(30,27,22,0.45)', // 45% ink
};

export const darkColors: Palette = {
  bg: '#14110C',
  card: '#221E16',
  ink: '#F5EFE2',
  line: '#EAE2CE', // cream borders — key to dark-mode contrast
  shadow: '#000000',
  muted: '#ABA28F',
  faint: '#7E7666',
  hair: '#383226',
  link: '#A5B4FF',
  nav: '#1B1712',
  scrim: 'rgba(0,0,0,0.55)',
};

// ── Candy accents (identical in both themes; always carry ink text on top) ───
export const candy = {
  yellow: '#FFD43B',
  mint: '#C7F0DB',
  pink: '#FFD6E8',
  coral: '#FF8787',
  blue: '#5C7CFA',
  lilac: '#D0BFFF',
} as const;
export type CandyColor = keyof typeof candy;

// Ink text always sits on candy backgrounds regardless of theme.
export const candyText = '#1E1B16';

// ── Semantic colors (theme-aware) ────────────────────────────────────────────
export type Semantic = { green: string; red: string; warn: string };
export const semantic: { light: Semantic; dark: Semantic } = {
  light: { green: '#0E9F6E', red: '#E03131', warn: '#B58A00' },
  dark: { green: '#7CE3A8', red: '#FF8787', warn: '#B58A00' },
};

// ── Category colors + emoji placeholders (README §Category colors + icons) ────
// Emoji are placeholders for the category icon set; the web app maps 33 lucide
// icons via `icon_name` — that registry will be reused on mobile later.
export const categoryStyle: Record<string, { color: string; emoji: string }> = {
  Food: { color: '#FF8787', emoji: '🍕' },
  Bills: { color: '#5C7CFA', emoji: '💡' },
  Travel: { color: '#FFD43B', emoji: '🚌' },
  Shopping: { color: '#C7F0DB', emoji: '🛍️' },
  Transfers: { color: '#C7F0DB', emoji: '🏦' },
  'Personal Care': { color: '#FFD6E8', emoji: '💇' },
  Education: { color: '#D0BFFF', emoji: '🎓' },
  Misc: { color: '#E8E2D4', emoji: '📦' },
};
export const categoryFallback = { color: '#E8E2D4', emoji: '📦' };

// ── Typography ────────────────────────────────────────────────────────────────
// Font-family keys must match the names registered in useAppFonts().
export const fontFamily = {
  headingSemi: 'Bricolage_600', // Bricolage Grotesque 600 — chips, small headings
  heading: 'Bricolage_700', // 700 — headings, buttons, merchant names
  headingBlack: 'Bricolage_800', // 800 — hero headings
  body: 'Archivo_400', // body
  bodyMedium: 'Archivo_500',
  bodySemi: 'Archivo_600',
  bodyBold: 'Archivo_700',
  money: 'ArchivoBlack', // all money amounts and big numerals
  mono: 'JetBrainsMono_400', // raw UPI strings, technical chips
  monoMedium: 'JetBrainsMono_500',
  monoBold: 'JetBrainsMono_700',
} as const;

// ── Shape system ──────────────────────────────────────────────────────────────
export const radius = {
  chip: 14,
  card: 16,
  cardLg: 20,
  sheet: 28,
  pill: 999,
} as const;

export const border = {
  card: 2, // 2px solid line on cards
  row: 1.5, // 1.5px on small rows/chips
} as const;

// Hard offset shadow sizes (px). Rendered as a translated solid layer behind.
export const shadowOffset = {
  chip: 2, // small chips 2px 2px 0
  card: 3, // hero/candy cards 3px 3px 0
  phone: 6, // phone-level 5–6px
  press: 1, // press state reduces shadow to 1px 1px 0
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

// Motion durations (README §Interactions): chips/toggles 200ms; bar widths 400ms.
export const motion = {
  press: 120,
  chip: 200,
  bar: 400,
} as const;
