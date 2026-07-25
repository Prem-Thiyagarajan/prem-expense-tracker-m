import { createContext, useCallback, useContext, useMemo, useState } from 'react';

import { currentMonth, formatMonthLabel, shiftMonth } from '@/lib/month';

/**
 * Shared month selection for the whole tab shell. Dashboard, Expenses, Budget,
 * and Trends all read the same `month` here so switching months in one place
 * moves every screen together. Mounted once in `(tabs)/_layout.tsx`.
 */
type MonthContextValue = {
  month: string; // 'YYYY-MM'
  label: string; // "Jul '26"
  goPrev: () => void;
  goNext: () => void;
  /** Jump directly to any `YYYY-MM` (clamped so we never land in the future). */
  setMonth: (month: string) => void;
  canGoNext: boolean; // false at the current month — we never page into the future
};

const MonthContext = createContext<MonthContextValue | null>(null);

export function MonthProvider({ children }: { children: React.ReactNode }) {
  const [month, setMonthState] = useState(currentMonth);

  const goPrev = useCallback(() => setMonthState((m) => shiftMonth(m, -1)), []);
  const goNext = useCallback(
    () => setMonthState((m) => (shiftMonth(m, 1) <= currentMonth() ? shiftMonth(m, 1) : m)),
    [],
  );
  const setMonth = useCallback(
    (next: string) => setMonthState(next <= currentMonth() ? next : currentMonth()),
    [],
  );

  const value = useMemo<MonthContextValue>(
    () => ({
      month,
      label: formatMonthLabel(month),
      goPrev,
      goNext,
      setMonth,
      canGoNext: month < currentMonth(),
    }),
    [month, goPrev, goNext, setMonth],
  );

  return <MonthContext.Provider value={value}>{children}</MonthContext.Provider>;
}

export function useMonth(): MonthContextValue {
  const ctx = useContext(MonthContext);
  if (!ctx) throw new Error('useMonth must be used within <MonthProvider>');
  return ctx;
}
