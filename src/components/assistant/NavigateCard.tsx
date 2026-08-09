import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { useTheme } from '@/theme';
import type { NavigateAction } from '@/lib/assistantActions';
import { useAddSheet } from '../AddSheetHost';
import { AppText } from '../ui/AppText';
import { PressableSurface } from '../ui/Surface';

/**
 * The assistant's one actionable affordance. Because v1 is read-only, this is
 * how "help me set up a budget" turns into something that actually happens —
 * it navigates and, where the destination supports it, opens the right sheet on
 * arrival so the user lands inside the flow rather than next to it.
 */
export function NavigateCard({ action }: { action: NavigateAction }) {
  const t = useTheme();
  const router = useRouter();
  const { openAdd } = useAddSheet();

  const go = () => {
    // The Add sheet is hosted globally by AddSheetHost, so it opens directly
    // wherever we are rather than needing the destination screen to react.
    if (action.sheet === 'add-transaction') {
      openAdd();
      return;
    }
    if (action.sheet) {
      router.push({ pathname: action.href as string, params: { open: action.sheet } } as never);
      return;
    }
    router.push(action.href);
  };

  return (
    <PressableSurface
      onPress={go}
      backgroundColor={t.candy.mint}
      offset={t.shadowOffset.chip}
      radius={t.radius.chip}
      style={{ alignSelf: 'flex-start' }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: t.spacing.sm,
          paddingHorizontal: t.spacing.lg,
          paddingVertical: t.spacing.md - 2,
        }}
      >
        <AppText style={{ fontSize: 13 }}>➜</AppText>
        <AppText variant="subheading" color={t.candyText}>
          {action.label}
        </AppText>
      </View>
    </PressableSurface>
  );
}
