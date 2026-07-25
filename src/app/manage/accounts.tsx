import { useState } from 'react';
import { View } from 'react-native';

import type { Account } from '@/api/accounts';
import { AccountEditorSheet } from '@/components/manage/AccountEditorSheet';
import { ConfirmSheet } from '@/components/ConfirmSheet';
import {
  AddButton,
  EmojiTile,
  EntityRow,
  ManageEmpty,
  ManageHeader,
  ManageSkeleton,
} from '@/components/manage/shared';
import { AppText, Screen, useToast } from '@/components/ui';
import { useAccounts, useDeleteAccount } from '@/hooks/useAccounts';
import { apiErrorMessage } from '@/lib/apiError';
import { useTheme } from '@/theme';

/** An emoji per account type, falling back to a bank glyph. */
function accountEmoji(type: string): string {
  const key = type.toLowerCase();
  if (key.includes('wallet')) return '👛';
  if (key.includes('card')) return '💳';
  if (key.includes('cash')) return '💵';
  return '🏦';
}

/** Manage accounts — list, add, edit, delete. */
export default function ManageAccountsScreen() {
  const t = useTheme();
  const toast = useToast();
  const { data, isLoading, isError } = useAccounts();
  const remove = useDeleteAccount();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Account | null>(null);

  const openCreate = () => {
    setEditing(null);
    setEditorOpen(true);
  };
  const openEdit = (account: Account) => {
    setEditing(account);
    setEditorOpen(true);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await remove.mutateAsync(pendingDelete.id);
      toast.show('Account deleted');
      setPendingDelete(null);
    } catch (e) {
      toast.show(apiErrorMessage(e, 'Could not delete — it may be in use'));
      setPendingDelete(null);
    }
  };

  const sorted = [...(data ?? [])].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <Screen tabBarInset={false}>
      <View style={{ gap: t.spacing.lg }}>
        <ManageHeader title="Accounts" subtitle="Where your transactions are drawn from." />
        <AddButton label="Add account" onPress={openCreate} />

        {isLoading ? (
          <ManageSkeleton t={t} />
        ) : isError ? (
          <ManageEmpty emoji="😕" text="Couldn't load your accounts. Pull back and try again." />
        ) : sorted.length === 0 ? (
          <ManageEmpty emoji="🏦" text="No accounts yet. Add your first one above." />
        ) : (
          <View style={{ gap: t.spacing.sm }}>
            {sorted.map((a) => (
              <EntityRow
                key={a.id}
                leading={<EmojiTile emoji={accountEmoji(a.type)} color={t.candy.mint} />}
                label={a.name}
                subtitle={`${a.type} · ${a.provider}`}
                onEdit={() => openEdit(a)}
                onDelete={() => setPendingDelete(a)}
              />
            ))}
          </View>
        )}

        <AppText variant="body" tone="faint" style={{ fontSize: 12, textAlign: 'center' }}>
          An account can only be deleted when no transactions use it.
        </AppText>
      </View>

      <AccountEditorSheet
        visible={editorOpen}
        account={editing}
        onClose={() => setEditorOpen(false)}
      />
      <ConfirmSheet
        visible={pendingDelete !== null}
        title="Delete account?"
        message={`"${pendingDelete?.name ?? ''}" will be removed. This can't be undone.`}
        loading={remove.isPending}
        onConfirm={confirmDelete}
        onClose={() => setPendingDelete(null)}
      />
    </Screen>
  );
}
