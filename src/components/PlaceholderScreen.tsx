import { View } from 'react-native';

import { useTheme } from '@/theme';
import { AppText, Card, Screen } from './ui';

type Props = {
  title: string;
  milestone: string;
  emoji: string;
  accent: string;
};

/** Branded placeholder used for tabs whose full build lands in a later milestone. */
export function PlaceholderScreen({ title, milestone, emoji, accent }: Props) {
  const t = useTheme();
  return (
    <Screen>
      <AppText variant="title" style={{ marginBottom: t.spacing.lg }}>
        {title}
      </AppText>
      <Card background={accent}>
        <View style={{ alignItems: 'center', paddingVertical: t.spacing.xl, gap: t.spacing.sm }}>
          <AppText style={{ fontSize: 40 }}>{emoji}</AppText>
          <AppText variant="heading" color={t.candyText}>
            Coming in {milestone}
          </AppText>
          <AppText variant="body" color={t.candyText} style={{ textAlign: 'center', opacity: 0.8 }}>
            This screen is stubbed for now. The shell, theme, and navigation are live.
          </AppText>
        </View>
      </Card>
    </Screen>
  );
}
