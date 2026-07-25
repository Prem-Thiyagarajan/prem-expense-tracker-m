import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { ChevronLeftIcon, ChevronRightIcon } from '@/components/icons';
import { MonthPickerSheet } from '@/components/MonthPickerSheet';
import { AppText } from '@/components/ui';
import { useMonth } from '@/state/MonthProvider';
import { useTheme } from '@/theme';

/**
 * The shared ‹ prev · month · next › control. Every tab header uses this so the
 * month-paging affordance looks and behaves identically everywhere. Tapping the
 * label opens a month/year picker to jump directly instead of stepping one by
 * one. Next is disabled (dimmed) at the current month — we never page into the
 * future.
 */
export function MonthSwitcher() {
  const t = useTheme();
  const { month, label, goPrev, goNext, setMonth, canGoNext } = useMonth();
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm }}>
      <Pressable onPress={goPrev} hitSlop={8}>
        <ChevronLeftIcon size={20} color={t.colors.ink} />
      </Pressable>
      <Pressable onPress={() => setPickerOpen(true)} hitSlop={8}>
        <AppText variant="heading" style={{ minWidth: 74, textAlign: 'center' }}>
          {label}
        </AppText>
      </Pressable>
      <Pressable onPress={goNext} hitSlop={8} disabled={!canGoNext}>
        <ChevronRightIcon size={20} color={canGoNext ? t.colors.ink : t.colors.faint} />
      </Pressable>

      <MonthPickerSheet
        visible={pickerOpen}
        value={month}
        onClose={() => setPickerOpen(false)}
        onSelect={(m) => {
          setMonth(m);
          setPickerOpen(false);
        }}
      />
    </View>
  );
}
