import { View } from 'react-native';

import { flattenMarkdown } from '@/lib/assistantText';
import { useTheme } from '@/theme';
import { AppText } from '../ui/AppText';
import { Surface } from '../ui/Surface';
import type { ChatMessage } from '@/state/assistantStore';
import { NavigateCard } from './NavigateCard';

type Props = {
  message: ChatMessage;
  /** Live text for the bubble currently streaming (overrides message.text). */
  streamingText?: string;
  onRetry?: () => void;
};

/**
 * One conversation turn. User turns are candy-blue and right-aligned; assistant
 * turns are card-coloured and left-aligned, both as Surfaces so they carry the
 * 2px ink border and hard offset shadow the rest of the app uses — a rounded
 * iOS-style pill would read as a foreign element here.
 */
export function ChatBubble({ message, streamingText, onRetry }: Props) {
  const t = useTheme();
  const isUser = message.role === 'user';
  const isStreaming = streamingText !== undefined;
  const body = isStreaming ? streamingText : flattenMarkdown(message.text);

  // A failed turn with no text at all renders as a dedicated error bubble.
  if (!isUser && message.error && !message.text) {
    return (
      <View style={{ alignSelf: 'flex-start', maxWidth: '92%', gap: t.spacing.sm }}>
        <Surface
          backgroundColor={t.candy.coral}
          offset={t.shadowOffset.chip}
          radius={t.radius.card}
          style={{ paddingHorizontal: t.spacing.lg, paddingVertical: t.spacing.md }}
        >
          <AppText variant="body" color={t.candyText}>
            {message.error}
          </AppText>
        </Surface>
        {onRetry ? (
          <Surface
            backgroundColor={t.colors.card}
            offset={t.shadowOffset.chip}
            radius={t.radius.pill}
            style={{ alignSelf: 'flex-start' }}
          >
            <AppText
              variant="subheading"
              onPress={onRetry}
              style={{ paddingHorizontal: t.spacing.lg, paddingVertical: t.spacing.sm }}
            >
              Retry
            </AppText>
          </Surface>
        ) : null}
      </View>
    );
  }

  return (
    <View
      style={{
        alignSelf: isUser ? 'flex-end' : 'flex-start',
        maxWidth: '92%',
        gap: t.spacing.sm,
      }}
    >
      <Surface
        backgroundColor={isUser ? t.candy.blue : t.colors.card}
        offset={t.shadowOffset.chip}
        radius={t.radius.card}
        style={{ paddingHorizontal: t.spacing.lg, paddingVertical: t.spacing.md }}
      >
        <AppText variant="body" color={isUser ? t.candyText : t.colors.ink}>
          {body}
          {isStreaming ? (
            // Block cursor so an in-progress reply never looks like a finished one.
            <AppText variant="body" tone="muted">
              {' ▌'}
            </AppText>
          ) : null}
        </AppText>
      </Surface>

      {message.action ? <NavigateCard action={message.action} /> : null}

      {/* Partial answer that then failed: keep the text, explain the stop. */}
      {message.error && message.text ? (
        <AppText variant="body" tone="muted" style={{ fontSize: 12 }}>
          {message.error}
        </AppText>
      ) : null}
    </View>
  );
}
