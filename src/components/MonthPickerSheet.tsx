import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { ChevronLeftIcon, ChevronRightIcon } from '@/components/icons';
import { AppText } from '@/components/ui';
import { PressableSurface } from '@/components/ui/Surface';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { MONTHS } from '@/lib/month';
import { useTheme } from '@/theme';

type Props = {
  visible: boolean;
  /** Currently selected month as `YYYY-MM`. */
  value: string;
  onClose: () => void;
  onSelect: (month: string) => void;
};

/**
 * Tap-to-jump month picker: a year stepper over a 3×4 grid of month cells.
 * Replaces stepping month-by-month. Future months (beyond the current one) are
 * disabled — the app never pages into the future.
 */
export function MonthPickerSheet({ visible, value, onClose, onSelect }: Props) {
  const t = useTheme();
  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = now.getMonth() + 1; // 1-based
  const selYear = Number(value.slice(0, 4));
  const selMonth = Number(value.slice(5, 7));

  const [year, setYear] = useState(selYear);

  // Re-sync to the selected year each time the sheet opens.
  useEffect(() => {
    if (visible) setYear(selYear);
  }, [visible, selYear]);

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={{ gap: t.spacing.lg, paddingBottom: t.spacing.sm }}>
        <AppText variant="title">Jump to month</AppText>

        {/* Year stepper */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: t.spacing.xl,
          }}
        >
          <Pressable onPress={() => setYear((y) => y - 1)} hitSlop={10}>
            <ChevronLeftIcon size={22} color={t.colors.ink} />
          </Pressable>
          <AppText variant="heading" style={{ fontSize: 20, minWidth: 72, textAlign: 'center' }}>
            {year}
          </AppText>
          <Pressable
            onPress={() => setYear((y) => (y < curYear ? y + 1 : y))}
            hitSlop={10}
            disabled={year >= curYear}
          >
            <ChevronRightIcon size={22} color={year < curYear ? t.colors.ink : t.colors.faint} />
          </Pressable>
        </View>

        {/* 3×4 month grid */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm }}>
          {MONTHS.map((label, i) => {
            const m = i + 1;
            const disabled = year > curYear || (year === curYear && m > curMonth);
            const selected = year === selYear && m === selMonth;
            const key = `${year}-${String(m).padStart(2, '0')}`;
            return (
              <PressableSurface
                key={label}
                disabled={disabled}
                onPress={() => onSelect(key)}
                backgroundColor={selected ? t.candy.blue : t.colors.card}
                borderColor={t.colors.line}
                radius={t.radius.chip}
                offset={selected ? t.shadowOffset.chip : 0}
                style={{
                  width: '31.5%',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: 14,
                  opacity: disabled ? 0.35 : 1,
                }}
              >
                <AppText
                  variant="subheading"
                  color={selected ? t.candyText : t.colors.ink}
                  style={{ fontSize: 15 }}
                >
                  {label}
                </AppText>
              </PressableSurface>
            );
          })}
        </View>
      </View>
    </BottomSheet>
  );
}
