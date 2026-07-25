import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { AppText, Button, TextField, useToast } from '@/components/ui';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { useDeleteMyAccount } from '@/hooks/useProfile';
import { apiErrorMessage } from '@/lib/apiError';
import { useTheme } from '@/theme';

type Props = {
  visible: boolean;
  onClose: () => void;
};

/**
 * Delete Account — irreversible, so it's gated behind re-entering the password.
 * On success we clear the query cache and sign out; the root navigator then
 * bounces to Login. The warning uses the coral candy card to read as dangerous.
 */
export function DeleteAccountSheet({ visible, onClose }: Props) {
  const t = useTheme();
  const toast = useToast();
  const qc = useQueryClient();
  const { signOut } = useAuth();
  const deleteAccount = useDeleteMyAccount();

  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setPassword('');
      setError(null);
    }
  }, [visible]);

  const onConfirm = async () => {
    if (!password) return setError('Enter your password to confirm');
    setError(null);
    try {
      await deleteAccount.mutateAsync(password);
      // Session is gone — drop all cached data, then flip to guest.
      qc.clear();
      await signOut();
      toast.show('Your account has been deleted');
    } catch (e) {
      setError(apiErrorMessage(e, 'Could not delete your account'));
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={{ gap: t.spacing.md, paddingBottom: t.spacing.sm }}>
        <AppText variant="title" style={{ fontSize: 18 }}>
          Delete account
        </AppText>

        <View
          style={{
            backgroundColor: t.candy.coral,
            borderRadius: t.radius.chip,
            borderWidth: t.border.row,
            borderColor: t.colors.line,
            padding: t.spacing.md,
          }}
        >
          <AppText variant="bodySemi" color={t.candyText}>
            This permanently deletes your account and every transaction, category, account, tag and
            budget in it. This cannot be undone.
          </AppText>
        </View>

        <TextField
          label="Confirm your password"
          placeholder="Your password"
          password
          value={password}
          onChangeText={setPassword}
        />

        {error ? (
          <AppText variant="body" color={t.semantic.red} style={{ fontSize: 12 }}>
            {error}
          </AppText>
        ) : null}

        <View style={{ flexDirection: 'row', gap: t.spacing.md, marginTop: t.spacing.xs }}>
          <View style={{ flex: 1 }}>
            <Button
              label="Cancel"
              variant="neutral"
              onPress={onClose}
              disabled={deleteAccount.isPending}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              label="Delete"
              variant="danger"
              loading={deleteAccount.isPending}
              onPress={onConfirm}
            />
          </View>
        </View>
      </View>
    </BottomSheet>
  );
}
