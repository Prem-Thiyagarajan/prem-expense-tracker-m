/**
 * Turn a raw bank/UPI narration into a friendly merchant name for list rows.
 *
 * Indian UPI narrations are slash-delimited and noisy, e.g.
 *   "UPI/DR/412345678901/SWIGGY/YESB/upi payment"
 *   "UPI/512233445566/Zomato Ltd/HDFC/Sent via GPay"
 *   "UPI/P2A/998877/RAHUL KUMAR/ICIC"
 * The human-meaningful part is the payee segment — the first slash token that
 * reads as a name rather than a code. We pick that, title-case it, and fall
 * back to the trimmed raw string when nothing looks like a name. The raw
 * narration is always still shown on tap, so this is a display nicety only.
 */

// Slash tokens that are structural noise, never the payee name.
const NOISE = new Set([
  'upi', 'dr', 'cr', 'p2a', 'p2m', 'ach', 'neft', 'imps', 'rtgs', 'mmt', 'ift',
  'payment', 'pay', 'sent', 'received', 'via', 'to', 'from', 'ref', 'txn', 'no',
  'gpay', 'phonepe', 'paytm', 'bhim', 'ybl', 'okaxis', 'okicici', 'okhdfcbank',
]);

// Trailing bank/handle codes to strip if they slip through (e.g. "SWIGGY YESB").
const BANK_SUFFIX = /\b(yesb|hdfc|icic|sbin|axis|utib|kkbk|pytm|barb|pnb)\b.*$/i;

function isCodeLike(token: string): boolean {
  // Mostly digits, or a short all-caps/alnum handle — not a readable name.
  const digits = (token.match(/\d/g) ?? []).length;
  if (digits >= token.length / 2) return true;
  return /^[a-z0-9]{1,3}$/i.test(token);
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bLtd\b/gi, 'Ltd');
}

/** Best-effort friendly payee name; falls back to the raw description. */
export function cleanMerchant(description: string | null | undefined): string {
  const raw = (description ?? '').trim();
  if (!raw) return 'Transaction';

  if (raw.includes('/')) {
    const tokens = raw.split('/').map((s) => s.trim()).filter(Boolean);
    const payee = tokens.find(
      (tok) => !NOISE.has(tok.toLowerCase()) && !isCodeLike(tok) && /[a-z]/i.test(tok),
    );
    if (payee) {
      const cleaned = payee.replace(BANK_SUFFIX, '').trim();
      return titleCase(cleaned || payee);
    }
  }

  // Non-UPI or unparseable: collapse whitespace, cap length for the row.
  const collapsed = raw.replace(/\s+/g, ' ');
  return collapsed.length > 40 ? `${collapsed.slice(0, 40)}…` : collapsed;
}
