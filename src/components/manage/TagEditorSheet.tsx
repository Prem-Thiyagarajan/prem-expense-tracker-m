import { useEffect, useState } from 'react';
import { View } from 'react-native';

import type { Tag } from '@/api/transactions';
import { AppText, Button, TextField, useToast } from '@/components/ui';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { useCreateTag, useUpdateTag } from '@/hooks/useTags';
import { apiErrorMessage } from '@/lib/apiError';
import { useTheme } from '@/theme';

type Props = {
  visible: boolean;
  /** The tag being edited, or null to create a new one. */
  tag: Tag | null;
  onClose: () => void;
};

/** Create/rename a tag — a single name field. */
export function TagEditorSheet({ visible, tag, onClose }: Props) {
  const t = useTheme();
  const toast = useToast();
  const create = useCreateTag();
  const update = useUpdateTag();
  const editing = tag !== null;

  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setName(tag?.name ?? '');
      setError(null);
    }
  }, [visible, tag]);

  const onSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) return setError('Give the tag a name');
    setError(null);
    try {
      if (editing) {
        await update.mutateAsync({ id: tag.id, name: trimmed });
        toast.show('Tag renamed ✓');
      } else {
        await create.mutateAsync(trimmed);
        toast.show('Tag added ✓');
      }
      onClose();
    } catch (e) {
      setError(apiErrorMessage(e, 'Could not save the tag'));
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={{ gap: t.spacing.md, paddingBottom: t.spacing.sm }}>
        <AppText variant="title" style={{ fontSize: 18 }}>
          {editing ? 'Rename tag' : 'New tag'}
        </AppText>

        <TextField
          label="Name"
          placeholder="e.g. reimbursable"
          value={name}
          onChangeText={setName}
          autoCapitalize="none"
        />

        {error ? (
          <AppText variant="body" color={t.semantic.red} style={{ fontSize: 12 }}>
            {error}
          </AppText>
        ) : null}

        <Button
          label={editing ? 'Save changes' : 'Add tag'}
          variant="primary"
          loading={create.isPending || update.isPending}
          onPress={onSave}
          style={{ marginTop: t.spacing.xs }}
        />
      </View>
    </BottomSheet>
  );
}
