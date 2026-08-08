import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { ChevronLeftIcon, ChevronRightIcon } from '@/components/icons';
import { AppText } from '@/components/ui';
import { PressableSurface } from '@/components/ui/Surface';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { todayKey } from '@/lib/format';
import { MONTHS, shiftMonth } from '@/lib/month';
import { useTheme, type Theme } from '@/theme';

type Props = {
  visible: boolean;
  /** Currently selected day as `YYYY-MM-DD`. */
  value: string;
  onClose: () => void;
  onSelect: (day: string) => void;
  /**
   * Lets future days/months/years be picked. Off by default — most uses are
   * transaction dates, which can't be in the future — but a subscription's
   * due date legitimately can be (e.g. later this month, or next month).
   */
  allowFuture?: boolean;
};

const WEEKDAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/**
 * Calendar day-picker shown in the bottom sheet. Month arrows page the grid; the
 * "Month Year" title flips to a month/year grid so you can jump directly instead
 * of stepping. Future days (and future months) are disabled unless `allowFuture`.
 */
export function DatePickerSheet({ visible, value, onClose, onSelect, allowFuture = false }: Props) {
  const t = useTheme();
  const today = todayKey();
  const [view, setView] = useState(value.slice(0, 7)); // 'YYYY-MM' on screen
  const [mode, setMode] = useState<'days' | 'months'>('days');

  // Reset to the selected month / day view each time the sheet opens.
  useEffect(() => {
    if (visible) {
      setView(value.slice(0, 7));
      setMode('days');
    }
  }, [visible, value]);

  const now = new Date();
  const curYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const canGoNextMonth = allowFuture || view < curYM;
  const [vy, vm] = view.split('-').map(Number);

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={{ gap: t.spacing.md, paddingBottom: t.spacing.sm }}>
        {/* Header: ‹ Month Year › — the title toggles the month/year grid. */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Pressable
            onPress={() => mode === 'days' && setView(shiftMonth(view, -1))}
            hitSlop={10}
            disabled={mode !== 'days'}
            style={{ opacity: mode === 'days' ? 1 : 0 }}
          >
            <ChevronLeftIcon size={22} color={t.colors.ink} />
          </Pressable>

          <Pressable onPress={() => setMode((m) => (m === 'days' ? 'months' : 'days'))} hitSlop={8}>
            <AppText variant="heading" style={{ fontSize: 17 }}>
              {MONTHS[vm - 1]} {vy}
            </AppText>
          </Pressable>

          <Pressable
            onPress={() => mode === 'days' && canGoNextMonth && setView(shiftMonth(view, 1))}
            hitSlop={10}
            disabled={mode !== 'days' || !canGoNextMonth}
            style={{ opacity: mode === 'days' ? 1 : 0 }}
          >
            <ChevronRightIcon
              size={22}
              color={canGoNextMonth ? t.colors.ink : t.colors.faint}
            />
          </Pressable>
        </View>

        {mode === 'days' ? (
          <DayGrid
            t={t}
            view={view}
            value={value}
            today={today}
            allowFuture={allowFuture}
            onPick={(day) => onSelect(day)}
          />
        ) : (
          <MonthGrid
            t={t}
            year={vy}
            selectedMonth={vm}
            curYM={curYM}
            allowFuture={allowFuture}
            onPickMonth={(m) => {
              setView(`${vy}-${String(m).padStart(2, '0')}`);
              setMode('days');
            }}
            onYear={(dir) => setView(`${vy + dir}-${String(vm).padStart(2, '0')}`)}
          />
        )}
      </View>
    </BottomSheet>
  );
}

/** 7-column day grid for the month in `view` (`YYYY-MM`). */
function DayGrid({
  t,
  view,
  value,
  today,
  allowFuture,
  onPick,
}: {
  t: Theme;
  view: string;
  value: string;
  today: string;
  allowFuture: boolean;
  onPick: (day: string) => void;
}) {
  const [y, m] = view.split('-').map(Number);
  const firstWeekday = new Date(y, m - 1, 1).getDay(); // 0 = Sun
  const lastDay = new Date(y, m, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: lastDay }, (_, i) => i + 1),
  ];

  return (
    <View style={{ gap: 4 }}>
      {/* Weekday header */}
      <View style={{ flexDirection: 'row' }}>
        {WEEKDAY_INITIALS.map((d, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center' }}>
            <AppText variant="label" tone="muted" style={{ fontSize: 11 }}>
              {d}
            </AppText>
          </View>
        ))}
      </View>

      {/* Day cells */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {cells.map((day, i) => {
          if (day == null) return <View key={`b${i}`} style={{ width: `${100 / 7}%`, height: 40 }} />;
          const key = `${view}-${String(day).padStart(2, '0')}`;
          const disabled = !allowFuture && key > today;
          const selected = key === value;
          const isToday = key === today;
          return (
            <View key={key} style={{ width: `${100 / 7}%`, height: 40, padding: 2 }}>
              <Pressable
                onPress={() => !disabled && onPick(key)}
                disabled={disabled}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 999,
                  backgroundColor: selected ? t.candy.blue : 'transparent',
                  borderWidth: isToday && !selected ? t.border.row : 0,
                  borderColor: t.colors.line,
                }}
              >
                <AppText
                  variant="bodySemi"
                  color={selected ? t.candyText : disabled ? t.colors.faint : t.colors.ink}
                  style={{ fontSize: 14 }}
                >
                  {day}
                </AppText>
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}

/** Year stepper + 3×4 month grid used when the header title is tapped. */
function MonthGrid({
  t,
  year,
  selectedMonth,
  curYM,
  allowFuture,
  onPickMonth,
  onYear,
}: {
  t: Theme;
  year: number;
  selectedMonth: number;
  curYM: string;
  allowFuture: boolean;
  onPickMonth: (m: number) => void;
  onYear: (dir: 1 | -1) => void;
}) {
  const curYear = Number(curYM.slice(0, 4));
  const curMonth = Number(curYM.slice(5, 7));
  const canGoNextYear = allowFuture || year < curYear;
  return (
    <View style={{ gap: t.spacing.md }}>
      <View
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: t.spacing.xl }}
      >
        <Pressable onPress={() => onYear(-1)} hitSlop={10}>
          <ChevronLeftIcon size={20} color={t.colors.ink} />
        </Pressable>
        <AppText variant="heading" style={{ fontSize: 18, minWidth: 68, textAlign: 'center' }}>
          {year}
        </AppText>
        <Pressable onPress={() => (canGoNextYear ? onYear(1) : null)} hitSlop={10} disabled={!canGoNextYear}>
          <ChevronRightIcon size={20} color={canGoNextYear ? t.colors.ink : t.colors.faint} />
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm }}>
        {MONTHS.map((label, i) => {
          const m = i + 1;
          const disabled = !allowFuture && (year > curYear || (year === curYear && m > curMonth));
          const selected = m === selectedMonth;
          return (
            <PressableSurface
              key={label}
              disabled={disabled}
              onPress={() => onPickMonth(m)}
              backgroundColor={selected ? t.candy.blue : t.colors.card}
              borderColor={t.colors.line}
              radius={t.radius.chip}
              offset={selected ? t.shadowOffset.chip : 0}
              style={{
                width: '31.5%',
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 12,
                opacity: disabled ? 0.35 : 1,
              }}
            >
              <AppText
                variant="subheading"
                color={selected ? t.candyText : t.colors.ink}
                style={{ fontSize: 14 }}
              >
                {label}
              </AppText>
            </PressableSurface>
          );
        })}
      </View>
    </View>
  );
}
