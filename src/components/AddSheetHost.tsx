import { createContext, useCallback, useContext, useMemo, useState } from 'react';

import type { Transaction } from '@/api/transactions';
import { AddTransactionForm } from './AddTransactionForm';
import { BottomSheet } from './ui/BottomSheet';

type AddSheetContextValue = {
  /** Open the sheet to create a new transaction. */
  openAdd: () => void;
  /** Open the sheet to edit an existing transaction (used by swipe → Edit). */
  openEdit: (txn: Transaction) => void;
  closeAdd: () => void;
};
const AddSheetContext = createContext<AddSheetContextValue | null>(null);

/**
 * Hosts the global Add / Edit transaction sheet, opened by the center FAB (add)
 * from any screen or by a swipe action (edit). The form is only mounted while
 * the sheet is visible, so each open starts from a clean draft (or the edited
 * transaction's values).
 */
export function AddSheetHost({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);

  const openAdd = useCallback(() => {
    setEditing(null);
    setVisible(true);
  }, []);
  const openEdit = useCallback((txn: Transaction) => {
    setEditing(txn);
    setVisible(true);
  }, []);
  const closeAdd = useCallback(() => setVisible(false), []);

  const value = useMemo(() => ({ openAdd, openEdit, closeAdd }), [openAdd, openEdit, closeAdd]);

  return (
    <AddSheetContext.Provider value={value}>
      {children}
      <BottomSheet visible={visible} onClose={closeAdd}>
        {visible ? <AddTransactionForm editing={editing} onDone={closeAdd} /> : null}
      </BottomSheet>
    </AddSheetContext.Provider>
  );
}

export function useAddSheet(): AddSheetContextValue {
  const ctx = useContext(AddSheetContext);
  if (!ctx) throw new Error('useAddSheet must be used within <AddSheetHost>');
  return ctx;
}
