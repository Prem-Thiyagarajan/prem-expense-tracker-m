import { View } from 'react-native';

import { parseAssistantText, type Block, type Span } from '@/lib/assistantText';
import { useTheme } from '@/theme';
import { AppText } from '../ui/AppText';

/**
 * Renders an assistant reply as typography rather than a wall of text.
 *
 * Three levels of emphasis, all from the existing type scale:
 *   - amounts   -> Archivo Black, the app's numeral face, so the figure the
 *                  user asked for is the first thing the eye lands on
 *   - **bold**  -> Archivo 700, whatever the model chose to stress
 *   - `code`    -> JetBrains Mono, matching how raw UPI strings render elsewhere
 *
 * Bullets and numbered items get a hanging indent so wrapped lines align to the
 * text, not back under the marker.
 *
 * `color` is threaded through because the same component renders on the candy
 * blue user bubble and the card-coloured assistant bubble.
 */
export function RichText({ text, color }: { text: string; color?: string }) {
  const blocks = parseAssistantText(text);

  if (blocks.length === 0) return null;

  return (
    // 4px, not 6: with several short bullets the looser rhythm stretched the
    // bubble taller than its content warranted.
    <View style={{ gap: 4 }}>
      {blocks.map((block, i) => (
        <BlockView key={i} block={block} color={color} isFirst={i === 0} />
      ))}
    </View>
  );
}

function BlockView({
  block,
  color,
  isFirst,
}: {
  block: Block;
  color?: string;
  isFirst: boolean;
}) {
  const t = useTheme();

  if (block.type === 'heading') {
    return (
      <AppText
        variant="subheading"
        color={color}
        style={{ marginTop: isFirst ? 0 : t.spacing.xs }}
      >
        <Spans spans={block.spans} color={color} />
      </AppText>
    );
  }

  if (block.type === 'bullet' || block.type === 'ordered') {
    const marker = block.type === 'bullet' ? '•' : block.marker;
    return (
      <View style={{ flexDirection: 'row', gap: t.spacing.sm }}>
        <AppText
          variant="body"
          color={color}
          // Fixed width keeps every marker on the same left edge; the text
          // column beside it gives wrapped lines their hanging indent.
          style={{ minWidth: block.type === 'ordered' ? 18 : 10, opacity: 0.55 }}
        >
          {marker}
        </AppText>
        {/* flexShrink, NOT flex:1. `flex: 1` makes every bullet row claim the
            full available width, which forced the whole bubble to the 92% max
            and wrapped a lot more ink around a lot more empty space. Shrink
            lets the bubble hug its content and still wrap long lines. */}
        <AppText variant="body" color={color} style={{ flexShrink: 1 }}>
          <Spans spans={block.spans} color={color} />
        </AppText>
      </View>
    );
  }

  return (
    <AppText variant="body" color={color}>
      <Spans spans={block.spans} color={color} />
    </AppText>
  );
}

function Spans({ spans, color }: { spans: Span[]; color?: string }) {
  const t = useTheme();

  return (
    <>
      {spans.map((span, i) => {
        if (span.money) {
          return (
            <AppText
              key={i}
              color={color}
              // Archivo Black at body size, not the 22px `money` variant: this
              // sits inline in a sentence, so it needs the numeral face without
              // the display size.
              style={{ fontFamily: t.font.money, fontSize: 14, letterSpacing: -0.2 }}
            >
              {span.text}
            </AppText>
          );
        }
        if (span.code) {
          return (
            <AppText key={i} variant="mono" color={color} style={{ fontSize: 13 }}>
              {span.text}
            </AppText>
          );
        }
        if (span.bold) {
          return (
            <AppText key={i} color={color} style={{ fontFamily: t.font.bodyBold, fontSize: 14 }}>
              {span.text}
            </AppText>
          );
        }
        return (
          <AppText key={i} variant="body" color={color}>
            {span.text}
          </AppText>
        );
      })}
    </>
  );
}
