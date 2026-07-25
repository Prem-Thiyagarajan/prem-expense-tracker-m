import { candy } from '@/theme/tokens';

/**
 * Maps a category to its "Pocket" presentation: an emoji glyph on a candy-tinted
 * circle. The backend stores a lucide `icon_name` (the web app renders it via a
 * 36-icon registry — see frontend `utils/iconHelper.tsx`); we translate each of
 * those names to an emoji + candy color so the mobile list keeps the sticker
 * aesthetic instead of pulling in an icon font. Unknown icons fall back to a
 * category-name keyword match, then to a neutral parcel.
 */

const NEUTRAL = '#E8E2D4'; // off-cream chip for miscellaneous/unknown

type Visual = { emoji: string; color: string };

// Keyed by the backend's lucide `icon_name`.
const BY_ICON: Record<string, Visual> = {
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
};

// Fallback keyword → icon key, mirroring the web's getCategoryIcon name matching.
const KEYWORD_TO_ICON: [string, string][] = [
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
];

/**
 * The icon options offered in the category editor. Each stores the backend's
 * lucide `icon_name` (so the web app renders the same glyph) but is presented as
 * its emoji + candy tint here. Order follows the map's declaration order.
 */
export const ICON_CHOICES: { icon: string; emoji: string; color: string }[] = Object.entries(
  BY_ICON,
).map(([icon, v]) => ({ icon, emoji: v.emoji, color: v.color }));

/** Emoji + candy color for a category, from its icon name (preferred) or name. */
export function categoryVisual(
  iconName?: string | null,
  categoryName?: string | null,
): Visual {
  if (iconName && BY_ICON[iconName]) return BY_ICON[iconName];

  const lower = (categoryName ?? '').toLowerCase();
  if (lower) {
    for (const [kw, icon] of KEYWORD_TO_ICON) {
      if (lower.includes(kw)) return BY_ICON[icon];
    }
  }
  return { emoji: '🏷️', color: NEUTRAL };
}
