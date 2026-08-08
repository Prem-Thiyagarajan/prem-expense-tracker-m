import { useState } from 'react';
import { Pressable, View } from 'react-native';

import type { Subscription } from '@/api/subscriptions';
import { ConfirmSheet } from '@/components/ConfirmSheet';
import { TrashIcon } from '@/components/icons';
import {
  AddButton,
  EmojiTile,
  ManageEmpty,
  ManageHeader,
  ManageSkeleton,
} from '@/components/manage/shared';
import { SubscriptionEditorSheet } from '@/components/manage/SubscriptionEditorSheet';
import { AppText, Screen, useToast } from '@/components/ui';
import { PressableSurface, Surface } from '@/components/ui/Surface';
import {
  useDeleteSubscription,
  useMarkSubscriptionPaid,
  useSubscriptions,
} from '@/hooks/useSubscriptions';
import { apiErrorMessage } from '@/lib/apiError';
import { formatINR, formatShortDate } from '@/lib/format';
import { useTheme, type Theme } from '@/theme';

const INTERVAL_LABEL: Record<string, string> = {
  weekly: 'week',
  biweekly: '2 weeks',
  monthly: 'month',
  quarterly: 'quarter',
  yearly: 'year',
};

/** Manage subscriptions — the source Bill Radar reads to predict upcoming bills. */
export default function ManageSubscriptionsScreen() {
  const t = useTheme();
  const toast = useToast();
  const { data, isLoading, isError } = useSubscriptions();
  const remove = useDeleteSubscription();
  const markPaid = useMarkSubscriptionPaid();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Subscription | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Subscription | null>(null);

  const openCreate = () => {
    setEditing(null);
    setEditorOpen(true);
  };
  const openEdit = (sub: Subscription) => {
    setEditing(sub);
    setEditorOpen(true);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await remove.mutateAsync(pendingDelete.id);
      toast.show('Subscription removed');
      setPendingDelete(null);
    } catch (e) {
      toast.show(apiErrorMessage(e, 'Could not remove the subscription'));
      setPendingDelete(null);
    }
  };

  const onMarkPaid = async (sub: Subscription) => {
    try {
      await markPaid.mutateAsync({ id: sub.id, paidForDate: sub.overdue_due_date ?? sub.upcoming_due_date });
      toast.show(`${sub.name} marked as paid ✓`);
    } catch (e) {
      toast.show(apiErrorMessage(e, 'Could not update — try again'));
    }
  };

  const sorted = [...(data ?? [])].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <Screen tabBarInset={false}>
      <View style={{ gap: t.spacing.lg }}>
        <ManageHeader
          title="Subscriptions"
          subtitle="Recurring bills Bill Radar tracks for you."
        />
        <AddButton label="Add subscription" onPress={openCreate} />

        {isLoading ? (
          <ManageSkeleton t={t} />
        ) : isError ? (
          <ManageEmpty emoji="😕" text="Couldn't load your subscriptions. Pull back and try again." />
        ) : sorted.length === 0 ? (
          <ManageEmpty emoji="📡" text="No subscriptions yet. Add your first one above." />
        ) : (
          <View style={{ gap: t.spacing.sm }}>
            {sorted.map((s) => (
              <SubscriptionRow
                key={s.id}
                t={t}
                sub={s}
                onEdit={() => openEdit(s)}
                onDelete={() => setPendingDelete(s)}
                onMarkPaid={() => onMarkPaid(s)}
                marking={markPaid.isPending}
              />
            ))}
          </View>
        )}
      </View>

      <SubscriptionEditorSheet visible={editorOpen} subscription={editing} onClose={() => setEditorOpen(false)} />
      <ConfirmSheet
        visible={pendingDelete !== null}
        title="Remove subscription?"
        message={`"${pendingDelete?.name ?? ''}" will stop showing up in Bill Radar. This can't be undone.`}
        loading={remove.isPending}
        onConfirm={confirmDelete}
        onClose={() => setPendingDelete(null)}
      />
    </Screen>
  );
}

function SubscriptionRow({
  t,
  sub,
  onEdit,
  onDelete,
  onMarkPaid,
  marking,
}: {
  t: Theme;
  sub: Subscription;
  onEdit: () => void;
  onDelete: () => void;
  onMarkPaid: () => void;
  marking: boolean;
}) {
  const isOverdue = sub.overdue_due_date != null;
  const dueDate = sub.overdue_due_date ?? sub.upcoming_due_date;

  return (
    <PressableSurface
      onPress={onEdit}
      radius={t.radius.chip}
      offset={t.shadowOffset.chip}
      style={{ padding: t.spacing.md, gap: t.spacing.sm }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.md }}>
        <EmojiTile emoji="📡" color={isOverdue ? t.candy.coral : t.candy.mint} />
        <View style={{ flex: 1 }}>
          <AppText variant="bodySemi" numberOfLines={1}>
            {sub.name}
          </AppText>
          <AppText variant="body" tone="muted" style={{ fontSize: 12, marginTop: 1 }} numberOfLines={1}>
            {formatINR(sub.amount)} / {INTERVAL_LABEL[sub.interval] ?? sub.interval}
          </AppText>
        </View>
        <Pressable onPress={onDelete} hitSlop={10} style={{ padding: 4 }}>
          <TrashIcon size={20} color={t.colors.muted} />
        </Pressable>
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTopWidth: t.border.row,
          borderTopColor: t.colors.hair,
          paddingTop: t.spacing.sm,
        }}
      >
        <AppText
          variant="label"
          color={isOverdue ? t.semantic.red : t.colors.muted}
          style={{ letterSpacing: 0, textTransform: 'none' }}
        >
          {isOverdue ? 'Overdue since' : 'Due'} {formatShortDate(dueDate)}
        </AppText>
        <Pressable onPress={onMarkPaid} disabled={marking} hitSlop={6}>
          <Surface
            backgroundColor={t.candy.mint}
            offset={0}
            borderWidth={t.border.row}
            radius={t.radius.pill}
            style={{ paddingHorizontal: t.spacing.md, paddingVertical: 6 }}
          >
            <AppText variant="subheading" color={t.candyText} style={{ fontSize: 11 }}>
              Mark as paid
            </AppText>
          </Surface>
        </Pressable>
      </View>
    </PressableSurface>
  );
}
