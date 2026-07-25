import { useState } from 'react';
import { View } from 'react-native';

import type { Tag } from '@/api/transactions';
import { TagEditorSheet } from '@/components/manage/TagEditorSheet';
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
import { useDeleteTag, useTags } from '@/hooks/useTags';
import { apiErrorMessage } from '@/lib/apiError';
import { useTheme } from '@/theme';

/** Manage tags — list, add, rename, delete. */
export default function ManageTagsScreen() {
  const t = useTheme();
  const toast = useToast();
  const { data, isLoading, isError } = useTags();
  const remove = useDeleteTag();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Tag | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Tag | null>(null);

  const openCreate = () => {
    setEditing(null);
    setEditorOpen(true);
  };
  const openEdit = (tag: Tag) => {
    setEditing(tag);
    setEditorOpen(true);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await remove.mutateAsync(pendingDelete.id);
      toast.show('Tag deleted');
      setPendingDelete(null);
    } catch (e) {
      toast.show(apiErrorMessage(e, 'Could not delete the tag'));
      setPendingDelete(null);
    }
  };

  const sorted = [...(data ?? [])].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <Screen tabBarInset={false}>
      <View style={{ gap: t.spacing.lg }}>
        <ManageHeader title="Tags" subtitle="Cross-cut labels you attach to transactions." />
        <AddButton label="Add tag" onPress={openCreate} />

        {isLoading ? (
          <ManageSkeleton t={t} />
        ) : isError ? (
          <ManageEmpty emoji="😕" text="Couldn't load your tags. Pull back and try again." />
        ) : sorted.length === 0 ? (
          <ManageEmpty emoji="🔖" text="No tags yet. Add your first one above." />
        ) : (
          <View style={{ gap: t.spacing.sm }}>
            {sorted.map((tag) => (
              <EntityRow
                key={tag.id}
                leading={<EmojiTile emoji="🔖" color={t.candy.lilac} />}
                label={tag.name}
                onEdit={() => openEdit(tag)}
                onDelete={() => setPendingDelete(tag)}
              />
            ))}
          </View>
        )}

        <AppText variant="body" tone="faint" style={{ fontSize: 12, textAlign: 'center' }}>
          Deleting a tag detaches it from any transactions — it will not delete them.
        </AppText>
      </View>

      <TagEditorSheet visible={editorOpen} tag={editing} onClose={() => setEditorOpen(false)} />
      <ConfirmSheet
        visible={pendingDelete !== null}
        title="Delete tag?"
        message={`"${pendingDelete?.name ?? ''}" will be removed from all transactions.`}
        loading={remove.isPending}
        onConfirm={confirmDelete}
        onClose={() => setPendingDelete(null)}
      />
    </Screen>
  );
}
