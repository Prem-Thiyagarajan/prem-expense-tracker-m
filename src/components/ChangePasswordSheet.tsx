import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { isPasswordValid, PasswordChecklist } from '@/components/PasswordChecklist';
import { AppText, Button, TextField, useToast } from '@/components/ui';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { useChangePassword } from '@/hooks/useProfile';
import { apiErrorMessage } from '@/lib/apiError';
import { useTheme } from '@/theme';

type Props = {
  visible: boolean;
  onClose: () => void;
};

/**
 * Change Password — a bottom sheet with the current password, a new password
 * (live-checked against the same 5 rules as Register), and a confirmation. On
 * success the user stays signed in (the backend keeps the session valid).
 */
export function ChangePasswordSheet({ visible, onClose }: Props) {
  const t = useTheme();
  const toast = useToast();
  const changePassword = useChangePassword();

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Clear the form each time the sheet opens.
  useEffect(() => {
    if (visible) {
      setCurrent('');
      setNext('');
      setConfirm('');
      setError(null);
    }
  }, [visible]);

  const onSubmit = async () => {
    if (!current) return setError('Enter your current password');
    if (!isPasswordValid(next)) return setError('New password does not meet all rules');
    if (next === current) return setError('New password must differ from the current one');
    if (next !== confirm) return setError('Passwords do not match');

    setError(null);
    try {
      await changePassword.mutateAsync({ old_password: current, new_password: next });
      toast.show('Password changed ✓');
      onClose();
    } catch (e) {
      setError(apiErrorMessage(e, 'Could not change password'));
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ gap: t.spacing.md, paddingBottom: t.spacing.sm }}
      >
        <AppText variant="title" style={{ fontSize: 18 }}>
          Change password
        </AppText>

        <TextField
          label="Current password"
          placeholder="Your current password"
          password
          value={current}
          onChangeText={setCurrent}
        />

        <View style={{ gap: t.spacing.sm }}>
          <TextField
            label="New password"
            placeholder="Create a strong one"
            password
            value={next}
            onChangeText={setNext}
          />
          <PasswordChecklist value={next} />
        </View>

        <TextField
          label="Confirm new password"
          placeholder="Repeat your new password"
          password
          value={confirm}
          onChangeText={setConfirm}
          error={confirm.length > 0 && confirm !== next ? 'Passwords do not match' : undefined}
        />

        {error ? (
          <AppText variant="body" color={t.semantic.red} style={{ fontSize: 12 }}>
            {error}
          </AppText>
        ) : null}

        <Button
          label="Update password"
          variant="primary"
          loading={changePassword.isPending}
          onPress={onSubmit}
          style={{ marginTop: t.spacing.xs }}
        />
      </ScrollView>
    </BottomSheet>
  );
}
