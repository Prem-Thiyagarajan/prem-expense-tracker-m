import { useMemo } from 'react';

import { currentMonth } from '@/lib/month';
import { useSubscriptions } from './useSubscriptions';

export type BillRadarItem = {
  id: number;
  name: string;
  amount: number;
  dueDate: string; // YYYY-MM-DD
  overdue: boolean;
};

/**
 * "Incoming" bills for the live month, sourced from user-declared
 * subscriptions (Manage → Subscriptions) — accurate for whoever's added
 * theirs, rather than guessed from transaction history (the old approach
 * mistook one-off P2P transfers for recurring bills and showed nothing for
 * anyone whose spending didn't happen to repeat in a detectable pattern).
 *
 * A subscription surfaces here if it's currently overdue (any month), or if
 * its next due date falls within the current calendar month — a subscription
 * due next month isn't "incoming" yet.
 */
export function useBillRadar() {
  const { data, isLoading } = useSubscriptions();

  const items = useMemo<BillRadarItem[]>(() => {
    if (!data) return [];
    const month = currentMonth();
    const result: BillRadarItem[] = [];
    for (const s of data) {
      if (s.overdue_due_date) {
        result.push({ id: s.id, name: s.name, amount: s.amount, dueDate: s.overdue_due_date, overdue: true });
      } else if (s.upcoming_due_date.slice(0, 7) === month) {
        result.push({ id: s.id, name: s.name, amount: s.amount, dueDate: s.upcoming_due_date, overdue: false });
      }
    }
    return result.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }, [data]);

  return { data: items, isLoading };
}
