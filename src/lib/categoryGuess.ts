import type { Category } from '@/api/categories';

/**
 * Lightweight client-side guess of a transaction's category from its note,
 * powering the Add sheet's "✨ Auto-detected" hint. This mirrors the spirit of
 * the backend's smart categorisation (keyword → category) but is only a UI
 * suggestion — the real category is whatever the user confirms, and the backend
 * still runs its own detection on save. Returns a category the user actually
 * has, or null.
 */

// Keyword → target words to look for in a category's name. First category whose
// name contains any target word wins.
const KEYWORD_GROUPS: { triggers: string[]; nameHints: string[] }[] = [
  { triggers: ['swiggy', 'zomato', 'restaurant', 'cafe', 'coffee', 'dinner', 'lunch', 'pizza', 'food', 'eat'], nameHints: ['food', 'dining', 'restaurant'] },
  { triggers: ['uber', 'ola', 'rapido', 'metro', 'cab', 'bus', 'train', 'auto', 'petrol', 'diesel', 'fuel'], nameHints: ['transport', 'travel', 'fuel', 'commute'] },
  { triggers: ['amazon', 'flipkart', 'myntra', 'ajio', 'shopping', 'store', 'mall'], nameHints: ['shop'] },
  { triggers: ['electricity', 'water', 'gas', 'recharge', 'broadband', 'wifi', 'bill', 'dth', 'postpaid', 'prepaid'], nameHints: ['bill', 'utilit'] },
  { triggers: ['rent', 'landlord', 'maintenance'], nameHints: ['rent', 'housing'] },
  { triggers: ['pharmacy', 'medicine', 'hospital', 'doctor', 'clinic', 'apollo'], nameHints: ['health', 'medic'] },
  { triggers: ['netflix', 'spotify', 'movie', 'bookmyshow', 'game', 'prime'], nameHints: ['entertain', 'subscription'] },
  { triggers: ['grocery', 'groceries', 'bigbasket', 'blinkit', 'zepto', 'vegetables', 'dmart'], nameHints: ['grocer'] },
  { triggers: ['salary', 'stipend', 'payroll'], nameHints: ['salary', 'income'] },
];

/** Best-effort category suggestion from a free-text note. */
export function guessCategory(note: string, categories: Category[]): Category | null {
  const text = note.trim().toLowerCase();
  if (text.length < 2 || categories.length === 0) return null;

  // 1) Direct: the note names a category outright.
  const direct = categories.find((c) => c.name.length >= 3 && text.includes(c.name.toLowerCase()));
  if (direct) return direct;

  // 2) Keyword: a trigger word points at a category by name hint.
  for (const group of KEYWORD_GROUPS) {
    if (!group.triggers.some((w) => text.includes(w))) continue;
    const match = categories.find((c) => {
      const name = c.name.toLowerCase();
      return group.nameHints.some((h) => name.includes(h));
    });
    if (match) return match;
  }
  return null;
}
