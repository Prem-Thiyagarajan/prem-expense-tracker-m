import { useRouter, type Href } from 'expo-router';
import { Pressable } from 'react-native';

import { useMonth } from '@/state/MonthProvider';
import { useTheme } from '@/theme';
import { AppText } from '../ui/AppText';
import { Surface } from '../ui/Surface';

/**
 * The assistant's entry point, sitting in every tab screen's header next to the
 * alert bell.
 *
 * This started as a floating action button so one mount could cover all four
 * tabs, but on device it overlapped the scrolling cards — it sat on top of the
 * category legend and hid a figure. A header slot costs four small edits
 * instead of one, and in exchange it can never cover content.
 *
 * Must be rendered inside MonthProvider (i.e. within the tabs group) so it can
 * hand the assistant the month currently being viewed; the assistant route
 * lives outside the tabs and cannot read it directly.
 */
export function AssistantButton() {
  const t = useTheme();
  const router = useRouter();
  const { month } = useMonth();

  return (
    <Pressable
      onPress={() => router.push(`/assistant?month=${month}` as Href)}
      accessibilityRole="button"
      accessibilityLabel="Ask the assistant"
      hitSlop={6}
    >
      <Surface
        backgroundColor={t.candy.lilac}
        offset={t.shadowOffset.chip}
        radius={999}
        style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
      >
        <AppText style={{ fontSize: 18 }}>✨</AppText>
      </Surface>
    </Pressable>
  );
}
