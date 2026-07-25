import { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import type { Account } from '@/api/accounts';
import { AppText, Button, TextField, useToast } from '@/components/ui';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { useCreateAccount, useUpdateAccount } from '@/hooks/useAccounts';
import { apiErrorMessage } from '@/lib/apiError';
import { useTheme } from '@/theme';

type Props = {
  visible: boolean;
  /** The account being edited, or null to create a new one. */
  account: Account | null;
  onClose: () => void;
};

const TYPES = ['Bank', 'Wallet', 'Card', 'Cash'] as const;

/** Create/edit an account: name, a type chip, and the provider. */
export function AccountEditorSheet({ visible, account, onClose }: Props) {
  const t = useTheme();
  const toast = useToast();
  const create = useCreateAccount();
  const update = useUpdateAccount();
  const editing = account !== null;

  const [name, setName] = useState('');
  const [type, setType] = useState<string>(TYPES[0]);
  const [provider, setProvider] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setName(account?.name ?? '');
      setType(account?.type ?? TYPES[0]);
      setProvider(account?.provider ?? '');
      setError(null);
    }
  }, [visible, account]);

  // If an existing account has a type outside our presets, keep it selectable.
  const typeOptions = TYPES.includes(type as (typeof TYPES)[number])
    ? [...TYPES]
    : [...TYPES, type];

  const onSave = async () => {
    const trimmedName = name.trim();
    const trimmedProvider = provider.trim();
    if (!trimmedName) return setError('Give the account a name');
    if (!trimmedProvider) return setError('Add a provider (e.g. HDFC, Paytm)');
    setError(null);
    try {
      const input = { name: trimmedName, type, provider: trimmedProvider };
      if (editing) {
        await update.mutateAsync({ id: account.id, input });
        toast.show('Account updated ✓');
      } else {
        await create.mutateAsync(input);
        toast.show('Account added ✓');
      }
      onClose();
    } catch (e) {
      setError(apiErrorMessage(e, 'Could not save the account'));
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
          {editing ? 'Edit account' : 'New account'}
        </AppText>

        <TextField
          label="Name"
          placeholder="e.g. Salary account"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />

        {/* Type chips */}
        <View style={{ gap: 6 }}>
          <AppText variant="label">Type</AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm }}>
            {typeOptions.map((opt) => {
              const selected = type === opt;
              return (
                <Pressable
                  key={opt}
                  onPress={() => setType(opt)}
                  style={{
                    paddingHorizontal: t.spacing.lg,
                    paddingVertical: 10,
                    borderRadius: t.radius.pill,
                    borderWidth: t.border.row,
                    borderColor: t.colors.line,
                    backgroundColor: selected ? t.candy.blue : t.colors.card,
                  }}
                >
                  <AppText variant="subheading" color={selected ? t.candyText : t.colors.ink}>
                    {opt}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>

        <TextField
          label="Provider"
          placeholder="e.g. HDFC, Paytm, SBI"
          value={provider}
          onChangeText={setProvider}
          autoCapitalize="characters"
        />

        {error ? (
          <AppText variant="body" color={t.semantic.red} style={{ fontSize: 12 }}>
            {error}
          </AppText>
        ) : null}

        <Button
          label={editing ? 'Save changes' : 'Add account'}
          variant="primary"
          loading={create.isPending || update.isPending}
          onPress={onSave}
          style={{ marginTop: t.spacing.xs }}
        />
      </ScrollView>
    </BottomSheet>
  );
}
