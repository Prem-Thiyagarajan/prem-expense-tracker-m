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
  canGoNext: boolean; // false at the current month — we never page into the future
};

const MonthContext = createContext<MonthContextValue | null>(null);

export function MonthProvider({ children }: { children: React.ReactNode }) {
  const [month, setMonth] = useState(currentMonth);

  const goPrev = useCallback(() => setMonth((m) => shiftMonth(m, -1)), []);
  const goNext = useCallback(
    () => setMonth((m) => (shiftMonth(m, 1) <= currentMonth() ? shiftMonth(m, 1) : m)),
    [],
  );

  const value = useMemo<MonthContextValue>(
    () => ({
      month,
      label: formatMonthLabel(month),
      goPrev,
      goNext,
      canGoNext: month < currentMonth(),
    }),
    [month, goPrev, goNext],
  );

  return <MonthContext.Provider value={value}>{children}</MonthContext.Provider>;
}

export function useMonth(): MonthContextValue {
  const ctx = useContext(MonthContext);
  if (!ctx) throw new Error('useMonth must be used within <MonthProvider>');
  return ctx;
}
