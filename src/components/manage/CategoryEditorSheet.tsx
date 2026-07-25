import { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import type { Category } from '@/api/categories';
import { AppText, Button, TextField, useToast } from '@/components/ui';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { useCreateCategory, useUpdateCategory } from '@/hooks/useCategories';
import { apiErrorMessage } from '@/lib/apiError';
import { ICON_CHOICES } from '@/lib/categoryVisual';
import { useTheme } from '@/theme';

type Props = {
  visible: boolean;
  /** The category being edited, or null to create a new one. */
  category: Category | null;
  onClose: () => void;
};

/** Create/edit a category: name, expense-vs-income, and an emoji icon picker. */
export function CategoryEditorSheet({ visible, category, onClose }: Props) {
  const t = useTheme();
  const toast = useToast();
  const create = useCreateCategory();
  const update = useUpdateCategory();
  const editing = category !== null;

  const [name, setName] = useState('');
  const [isIncome, setIsIncome] = useState(false);
  const [icon, setIcon] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Seed the form from the category (or blank) each time the sheet opens.
  useEffect(() => {
    if (visible) {
      setName(category?.name ?? '');
      setIsIncome(category?.is_income ?? false);
      setIcon(category?.icon_name ?? null);
      setError(null);
    }
  }, [visible, category]);

  const onSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) return setError('Give the category a name');
    setError(null);
    try {
      if (editing) {
        await update.mutateAsync({
          id: category.id,
          input: { name: trimmed, is_income: isIncome, icon_name: icon },
        });
        toast.show('Category updated ✓');
      } else {
        await create.mutateAsync({ name: trimmed, is_income: isIncome, icon_name: icon });
        toast.show('Category added ✓');
      }
      onClose();
    } catch (e) {
      setError(apiErrorMessage(e, 'Could not save the category'));
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
          {editing ? 'Edit category' : 'New category'}
        </AppText>

        <TextField label="Name" placeholder="e.g. Groceries" value={name} onChangeText={setName} autoCapitalize="words" />

        {/* Expense / Income toggle */}
        <View style={{ gap: 6 }}>
          <AppText variant="label">Type</AppText>
          <View style={{ flexDirection: 'row', gap: t.spacing.sm }}>
            {[
              { key: false, label: 'Expense' },
              { key: true, label: 'Income' },
            ].map((opt) => {
              const selected = isIncome === opt.key;
              return (
                <Pressable
                  key={opt.label}
                  onPress={() => setIsIncome(opt.key)}
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    paddingVertical: 12,
                    borderRadius: t.radius.chip,
                    borderWidth: t.border.row,
                    borderColor: t.colors.line,
                    backgroundColor: selected ? (opt.key ? t.candy.mint : t.candy.coral) : t.colors.card,
                  }}
                >
                  <AppText variant="subheading" color={selected ? t.candyText : t.colors.ink}>
                    {opt.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Emoji icon picker */}
        <View style={{ gap: 6 }}>
          <AppText variant="label">Icon</AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm }}>
            {ICON_CHOICES.map((choice) => {
              const selected = icon === choice.icon;
              return (
                <Pressable
                  key={choice.icon}
                  onPress={() => setIcon(selected ? null : choice.icon)}
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 999,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: selected ? t.border.card : t.border.row,
                    borderColor: selected ? t.colors.ink : t.colors.line,
                    backgroundColor: choice.color,
                  }}
                >
                  <AppText style={{ fontSize: 20 }}>{choice.emoji}</AppText>
                </Pressable>
              );
            })}
          </View>
        </View>

        {error ? (
          <AppText variant="body" color={t.semantic.red} style={{ fontSize: 12 }}>
            {error}
          </AppText>
        ) : null}

        <Button
          label={editing ? 'Save changes' : 'Add category'}
          variant="primary"
          loading={create.isPending || update.isPending}
          onPress={onSave}
          style={{ marginTop: t.spacing.xs }}
        />
      </ScrollView>
    </BottomSheet>
  );
}
