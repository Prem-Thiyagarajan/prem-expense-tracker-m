import { View } from 'react-native';

import { AppText, Button } from '@/components/ui';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { useTheme } from '@/theme';

type Props = {
  visible: boolean;
  title: string;
  message: string;
  /** Label for the destructive action button. */
  confirmLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

/**
 * A small confirm sheet for destructive one-tap actions (deleting a category,
 * account, or tag). The confirm button is the danger variant; Cancel is neutral.
 */
export function ConfirmSheet({
  visible,
  title,
  message,
  confirmLabel = 'Delete',
  loading,
  onConfirm,
  onClose,
}: Props) {
  const t = useTheme();
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={{ gap: t.spacing.md, paddingBottom: t.spacing.sm }}>
        <AppText variant="title" style={{ fontSize: 18 }}>
          {title}
        </AppText>
        <AppText variant="body" tone="muted">
          {message}
        </AppText>
        <View style={{ flexDirection: 'row', gap: t.spacing.md, marginTop: t.spacing.xs }}>
          <View style={{ flex: 1 }}>
            <Button label="Cancel" variant="neutral" onPress={onClose} disabled={loading} />
          </View>
          <View style={{ flex: 1 }}>
            <Button label={confirmLabel} variant="danger" loading={loading} onPress={onConfirm} />
          </View>
        </View>
      </View>
    </BottomSheet>
  );
}
