import { Pressable, View } from 'react-native';

import { ChevronLeftIcon, ChevronRightIcon } from '@/components/icons';
import { AppText } from '@/components/ui';
import { useMonth } from '@/state/MonthProvider';
import { useTheme } from '@/theme';

/**
 * The shared ‹ prev · month · next › control. Every tab header uses this so the
 * month-paging affordance looks and behaves identically everywhere. Next is
 * disabled (dimmed) at the current month — we never page into the future.
 */
export function MonthSwitcher() {
  const t = useTheme();
  const { label, goPrev, goNext, canGoNext } = useMonth();

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm }}>
      <Pressable onPress={goPrev} hitSlop={8}>
        <ChevronLeftIcon size={20} color={t.colors.ink} />
      </Pressable>
      <AppText variant="heading" style={{ minWidth: 74, textAlign: 'center' }}>
        {label}
      </AppText>
      <Pressable onPress={goNext} hitSlop={8} disabled={!canGoNext}>
        <ChevronRightIcon size={20} color={canGoNext ? t.colors.ink : t.colors.faint} />
      </Pressable>
    </View>
  );
}
