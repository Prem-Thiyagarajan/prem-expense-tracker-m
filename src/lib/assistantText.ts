/**
 * Lightweight markdown parser for assistant replies.
 *
 * The system prompt asks the model for plain text and it emits markdown anyway
 * — `**bold**`, `- ` bullets, the occasional `###`. An earlier version stripped
 * all of it, which threw away the model's own sense of what mattered in a
 * sentence. Parsing it instead costs nothing (no prompt tokens, no backend
 * work) and turns that emphasis into real typography.
 *
 * Money amounts are detected here too, independently of what the model marks
 * up, so every figure gets the Archivo Black numeral treatment the rest of the
 * app uses for amounts — the number is the thing the eye should land on.
 *
 * Deliberately not a full markdown implementation: no tables, images, links or
 * blockquotes. The model does not emit them in two-sentence answers, and a real
 * parser would be a dependency for no gain.
 */

export type Span = {
  text: string;
  bold?: boolean;
  money?: boolean;
  code?: boolean;
};

export type Block =
  | { type: 'heading'; spans: Span[] }
  | { type: 'para'; spans: Span[] }
  | { type: 'bullet'; spans: Span[] }
  | { type: 'ordered'; marker: string; spans: Span[] };

/** `Rs.1,234` / `Rs 1,234` / `₹1,234` / `Rs.1,234.50` */
const MONEY_RE = /(?:₹\s?|Rs\.?\s?)\d[\d,]*(?:\.\d{1,2})?/g;

/** `**bold**` | `__bold__` | `` `code` `` | `*italic*` (markers dropped) */
const INLINE_RE = /(\*\*|__)(.+?)\1|`([^`]+)`|\*(?!\*)([^*\n]+)\*/g;

function moneySpans(text: string, base: Partial<Span>): Span[] {
  const out: Span[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  MONEY_RE.lastIndex = 0;
  while ((m = MONEY_RE.exec(text)) !== null) {
    if (m.index > last) out.push({ ...base, text: text.slice(last, m.index) });
    out.push({ ...base, text: m[0], money: true });
    last = MONEY_RE.lastIndex;
  }
  if (last < text.length) out.push({ ...base, text: text.slice(last) });
  return out;
}

function inlineSpans(text: string): Span[] {
  const out: Span[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  INLINE_RE.lastIndex = 0;
  while ((m = INLINE_RE.exec(text)) !== null) {
    if (m.index > last) out.push(...moneySpans(text.slice(last, m.index), {}));
    if (m[2] !== undefined) out.push(...moneySpans(m[2], { bold: true }));
    else if (m[3] !== undefined) out.push({ text: m[3], code: true });
    // Italic markers are dropped rather than rendered: the app loads no italic
    // font face, so RN would synthesise a skewed one that looks broken.
    else if (m[4] !== undefined) out.push(...moneySpans(m[4], {}));
    last = INLINE_RE.lastIndex;
  }
  if (last < text.length) out.push(...moneySpans(text.slice(last), {}));
  return out.filter((s) => s.text.length > 0);
}

/** Parse a reply into renderable blocks. */
export function parseAssistantText(input: string): Block[] {
  const cleaned = input
    // Drop code-fence lines but keep their contents.
    .replace(/^```[a-z]*\s*$/gim, '')
    .replace(/\r\n/g, '\n')
    .trim();

  const blocks: Block[] = [];
  let paragraph: string[] = [];

  const flush = () => {
    if (paragraph.length === 0) return;
    blocks.push({ type: 'para', spans: inlineSpans(paragraph.join(' ')) });
    paragraph = [];
  };

  for (const rawLine of cleaned.split('\n')) {
    const line = rawLine.trim();

    if (!line) {
      flush();
      continue;
    }

    const heading = /^#{1,6}\s+(.*)$/.exec(line);
    if (heading) {
      flush();
      blocks.push({ type: 'heading', spans: inlineSpans(heading[1]) });
      continue;
    }

    const bullet = /^[-*•]\s+(.*)$/.exec(line);
    if (bullet) {
      flush();
      blocks.push({ type: 'bullet', spans: inlineSpans(bullet[1]) });
      continue;
    }

    const ordered = /^(\d{1,2})[.)]\s+(.*)$/.exec(line);
    if (ordered) {
      flush();
      blocks.push({ type: 'ordered', marker: `${ordered[1]}.`, spans: inlineSpans(ordered[2]) });
      continue;
    }

    // Plain line — join with neighbours so a soft-wrapped sentence stays one
    // paragraph rather than becoming several stacked lines.
    paragraph.push(line);
  }

  flush();
  return blocks;
}
