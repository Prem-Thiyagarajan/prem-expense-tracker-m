import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/theme';
import { AppText } from './ui/AppText';
import { BottomSheet } from './ui/BottomSheet';

type AddSheetContextValue = { openAdd: () => void; closeAdd: () => void };
const AddSheetContext = createContext<AddSheetContextValue | null>(null);

/**
 * Hosts the global "Add transaction" sheet, opened by the center FAB from any
 * screen. Placeholder content for now — the full Add flow arrives in Milestone 3.
 */
export function AddSheetHost({ children }: { children: React.ReactNode }) {
  const t = useTheme();
  const [visible, setVisible] = useState(false);

  const openAdd = useCallback(() => setVisible(true), []);
  const closeAdd = useCallback(() => setVisible(false), []);
  const value = useMemo(() => ({ openAdd, closeAdd }), [openAdd, closeAdd]);

  return (
    <AddSheetContext.Provider value={value}>
      {children}
      <BottomSheet visible={visible} onClose={closeAdd}>
        <View style={{ paddingVertical: t.spacing.xl, alignItems: 'center', gap: t.spacing.sm }}>
          <AppText variant="title">Add transaction</AppText>
          <AppText variant="body" tone="muted" style={{ textAlign: 'center' }}>
            The full Add flow (amount keypad, category chips, smart-category hint)
            arrives in Milestone 3.
          </AppText>
        </View>
      </BottomSheet>
    </AddSheetContext.Provider>
  );
}

export function useAddSheet(): AddSheetContextValue {
  const ctx = useContext(AddSheetContext);
  if (!ctx) throw new Error('useAddSheet must be used within <AddSheetHost>');
  return ctx;
}
