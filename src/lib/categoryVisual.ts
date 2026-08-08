import { candy } from '@/theme';

/**
 * Category icon resolution (CONVENTIONS §1) — the single source of truth for
 * turning a backend category into an emoji on a candy-tinted badge.
 *
 * The backend stores a lucide `icon_name` per category (`utensils`, `leaf`, …);
 * the web app renders those via a 36-icon registry (frontend
 * `utils/iconHelper.tsx`), but we never render lucide on mobile, so each name
 * maps to one emoji + one candy color here — keeping the sticker aesthetic
 * without pulling in an icon font. Resolves in three steps: exact `icon_name` →
 * keyword match on the category name → neutral fallback.
 *
 * Adding an icon: add one row to BY_ICON keyed by the lucide name. This is the
 * only place a category-to-emoji mapping may live — never map one inline.
 */

export type CategoryVisual = { emoji: string; color: string };

/** Neutral badge fill for miscellaneous/unmatched categories. */
const NEUTRAL = '#E8E2D4';

const BY_ICON: Record<string, CategoryVisual> = {
  utensils: { emoji: '🍴', color: candy.coral },
  pizza: { emoji: '🍕', color: candy.coral },
  'shopping-bag': { emoji: '🛍️', color: candy.blue },
  shirt: { emoji: '👕', color: candy.blue },
  car: { emoji: '🚗', color: candy.yellow },
  train: { emoji: '🚆', color: candy.yellow },
  bus: { emoji: '🚌', color: candy.yellow },
  ticket: { emoji: '🎟️', color: candy.lilac },
  clapperboard: { emoji: '🎬', color: candy.lilac },
  'gamepad-2': { emoji: '🎮', color: candy.lilac },
  zap: { emoji: '⚡', color: candy.coral },
  receipt: { emoji: '🧾', color: candy.coral },
  heart: { emoji: '❤️', color: candy.pink },
  pill: { emoji: '💊', color: candy.pink },
  ambulance: { emoji: '🚑', color: candy.coral },
  'graduation-cap': { emoji: '🎓', color: candy.lilac },
  university: { emoji: '🏛️', color: candy.lilac },
  home: { emoji: '🏠', color: candy.mint },
  plane: { emoji: '✈️', color: candy.blue },
  building: { emoji: '🏢', color: candy.yellow },
  leaf: { emoji: '🌿', color: candy.mint },
  sprout: { emoji: '🌱', color: candy.mint },
  'paw-print': { emoji: '🐾', color: candy.yellow },
  cat: { emoji: '🐱', color: candy.yellow },
  dog: { emoji: '🐶', color: candy.yellow },
  briefcase: { emoji: '💼', color: candy.blue },
  laptop: { emoji: '💻', color: candy.blue },
  phone: { emoji: '📱', color: candy.blue },
  gift: { emoji: '🎁', color: candy.pink },
  dumbbell: { emoji: '🏋️', color: candy.coral },
  coffee: { emoji: '☕', color: candy.yellow },
  'piggy-bank': { emoji: '🐷', color: candy.pink },
  landmark: { emoji: '🏦', color: candy.mint },
  shapes: { emoji: '🔷', color: NEUTRAL },
  package: { emoji: '📦', color: NEUTRAL },

  // Expanded set — kept to lucide-style kebab-case names (matching the web
  // app's icon_name convention) so a category made here still reads sensibly
  // if the web app ever adds matching entries to its own registry; until
  // then it just falls back to web's generic icon there, same as any
  // unrecognised icon_name already does.
  repeat: { emoji: '🔁', color: candy.blue },
  shield: { emoji: '🛡️', color: candy.mint },
  droplet: { emoji: '💧', color: candy.blue },
  wifi: { emoji: '📶', color: candy.blue },
  music: { emoji: '🎵', color: candy.lilac },
  'book-open': { emoji: '📚', color: candy.lilac },
  scissors: { emoji: '✂️', color: candy.pink },
  sparkles: { emoji: '✨', color: candy.pink },
  scale: { emoji: '⚖️', color: candy.yellow },
  'heart-handshake': { emoji: '🤝', color: candy.mint },
  gem: { emoji: '💍', color: candy.pink },
  baby: { emoji: '👶', color: candy.pink },
  sofa: { emoji: '🛋️', color: candy.mint },
  wrench: { emoji: '🔧', color: candy.yellow },
  palette: { emoji: '🎨', color: candy.lilac },
  camera: { emoji: '📷', color: candy.lilac },
  bike: { emoji: '🚲', color: candy.yellow },
  stethoscope: { emoji: '🩺', color: candy.coral },
  syringe: { emoji: '💉', color: candy.coral },
  wallet: { emoji: '👛', color: candy.blue },
  'credit-card': { emoji: '💳', color: candy.blue },
  umbrella: { emoji: '☂️', color: candy.blue },
  trophy: { emoji: '🏆', color: candy.yellow },
  cake: { emoji: '🎂', color: candy.pink },
  'trending-up': { emoji: '📈', color: candy.mint },
};

/** Keyword → icon key, matched against the category name. First hit wins. */
const BY_KEYWORD: [string, string][] = [
  ['salary', 'briefcase'],
  ['food', 'utensils'],
  ['grocer', 'leaf'],
  ['rent', 'home'],
  ['travel', 'plane'],
  ['transfer', 'landmark'],
  ['bill', 'zap'],
  ['shop', 'shopping-bag'],
  ['health', 'heart'],
  ['medic', 'pill'],
  ['education', 'graduation-cap'],
  ['entertain', 'ticket'],
  ['invest', 'landmark'],
  ['saving', 'piggy-bank'],
  ['fuel', 'car'],
  ['transport', 'bus'],
  ['subscription', 'repeat'],
  ['insurance', 'shield'],
  ['internet', 'wifi'],
  ['water', 'droplet'],
  ['music', 'music'],
  ['book', 'book-open'],
  ['beauty', 'scissors'],
  ['salon', 'scissors'],
  ['tax', 'scale'],
  ['legal', 'scale'],
  ['charity', 'heart-handshake'],
  ['donat', 'heart-handshake'],
  ['wedding', 'gem'],
  ['jewel', 'gem'],
  ['child', 'baby'],
  ['kid', 'baby'],
  ['furniture', 'sofa'],
  ['repair', 'wrench'],
  ['maintenance', 'wrench'],
  ['hobby', 'palette'],
  ['photo', 'camera'],
  ['cycl', 'bike'],
  ['doctor', 'stethoscope'],
  ['clinic', 'stethoscope'],
  ['vaccin', 'syringe'],
  ['loan', 'credit-card'],
  ['emi', 'credit-card'],
  ['stock', 'trending-up'],
  ['crypto', 'trending-up'],
  ['party', 'cake'],
  ['celebrat', 'cake'],
  ['sport', 'trophy'],
];

const FALLBACK: CategoryVisual = { emoji: '🏷️', color: NEUTRAL };

/**
 * The icon options offered in the category editor. Each stores the backend's
 * lucide `icon_name` (so the web app renders the same glyph) but is presented as
 * its emoji + candy tint here. Order follows BY_ICON's declaration order.
 */
export const ICON_CHOICES: { icon: string; emoji: string; color: string }[] = Object.entries(
  BY_ICON,
).map(([icon, v]) => ({ icon, emoji: v.emoji, color: v.color }));

/** Resolve a category's badge emoji + candy fill. */
export function categoryVisual(iconName?: string | null, name?: string | null): CategoryVisual {
  const icon = iconName?.trim().toLowerCase();
  if (icon && BY_ICON[icon]) return BY_ICON[icon];

  const lowerName = name?.trim().toLowerCase();
  if (lowerName) {
    for (const [keyword, iconKey] of BY_KEYWORD) {
      if (lowerName.includes(keyword)) return BY_ICON[iconKey];
    }
  }

  return FALLBACK;
}
