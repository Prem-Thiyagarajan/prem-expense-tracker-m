import { useState } from 'react';
import { View } from 'react-native';

import type { Category } from '@/api/categories';
import { CategoryEditorSheet } from '@/components/manage/CategoryEditorSheet';
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
import { useCategories, useDeleteCategory } from '@/hooks/useCategories';
import { apiErrorMessage } from '@/lib/apiError';
import { categoryVisual } from '@/lib/categoryVisual';
import { useTheme } from '@/theme';

/** Manage categories — list, add, edit, delete. */
export default function ManageCategoriesScreen() {
  const t = useTheme();
  const toast = useToast();
  const { data, isLoading, isError } = useCategories();
  const remove = useDeleteCategory();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null);

  const openCreate = () => {
    setEditing(null);
    setEditorOpen(true);
  };
  const openEdit = (category: Category) => {
    setEditing(category);
    setEditorOpen(true);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await remove.mutateAsync(pendingDelete.id);
      toast.show('Category deleted');
      setPendingDelete(null);
    } catch (e) {
      toast.show(apiErrorMessage(e, 'Could not delete — it may be in use'));
      setPendingDelete(null);
    }
  };

  // Expenses first, then income; alphabetical within each group.
  const sorted = [...(data ?? [])].sort(
    (a, b) => Number(a.is_income) - Number(b.is_income) || a.name.localeCompare(b.name),
  );

  return (
    <Screen tabBarInset={false}>
      <View style={{ gap: t.spacing.lg }}>
        <ManageHeader title="Categories" subtitle="Organise where your money goes." />
        <AddButton label="Add category" onPress={openCreate} />

        {isLoading ? (
          <ManageSkeleton t={t} />
        ) : isError ? (
          <ManageEmpty emoji="😕" text="Couldn't load your categories. Pull back and try again." />
        ) : sorted.length === 0 ? (
          <ManageEmpty emoji="🏷️" text="No categories yet. Add your first one above." />
        ) : (
          <View style={{ gap: t.spacing.sm }}>
            {sorted.map((c) => {
              const v = categoryVisual(c.icon_name, c.name);
              return (
                <EntityRow
                  key={c.id}
                  leading={<EmojiTile emoji={v.emoji} color={v.color} />}
                  label={c.name}
                  subtitle={c.is_income ? 'Income' : 'Expense'}
                  onEdit={() => openEdit(c)}
                  onDelete={() => setPendingDelete(c)}
                />
              );
            })}
          </View>
        )}

        <AppText variant="body" tone="faint" style={{ fontSize: 12, textAlign: 'center' }}>
          A category can only be deleted when no transactions use it.
        </AppText>
      </View>

      <CategoryEditorSheet
        visible={editorOpen}
        category={editing}
        onClose={() => setEditorOpen(false)}
      />
      <ConfirmSheet
        visible={pendingDelete !== null}
        title="Delete category?"
        message={`"${pendingDelete?.name ?? ''}" will be removed. This can't be undone.`}
        loading={remove.isPending}
        onConfirm={confirmDelete}
        onClose={() => setPendingDelete(null)}
      />
    </Screen>
  );
}
