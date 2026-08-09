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
import { Surface } from '@/components/ui/Surface';
import {
  useDeleteSubscription,
  useMarkSubscriptionPaid,
  useSubscriptions,
  useUnmarkSubscriptionPaid,
} from '@/hooks/useSubscriptions';
import { apiErrorMessage } from '@/lib/apiError';
import { formatINR, formatShortDate, todayKey } from '@/lib/format';
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
  const unmarkPaid = useUnmarkSubscriptionPaid();

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

  // Fire-and-forget rather than awaiting: the button already reflects the
  // change instantly via the mutation's optimistic update, so the toast
  // should match that — not wait on the real network round trip behind it.
  // The mutation's own onError already rolls the cache back; this callback
  // just also tells the user it didn't stick.
  const onMarkPaid = (sub: Subscription) => {
    markPaid.mutate(
      { id: sub.id, paidForDate: sub.overdue_due_date ?? sub.upcoming_due_date },
      { onError: (e) => toast.show(apiErrorMessage(e, 'Could not update — try again')) },
    );
    toast.show(`${sub.name} marked as paid ✓`);
  };

  const onUnmarkPaid = (sub: Subscription) => {
    unmarkPaid.mutate(sub.id, {
      onError: (e) => toast.show(apiErrorMessage(e, 'Could not update — try again')),
    });
    toast.show(`${sub.name} marked as unpaid`);
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
                onUnmarkPaid={() => onUnmarkPaid(s)}
                marking={markPaid.isPending || unmarkPaid.isPending}
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
  onUnmarkPaid,
  marking,
}: {
  t: Theme;
  sub: Subscription;
  onEdit: () => void;
  onDelete: () => void;
  onMarkPaid: () => void;
  onUnmarkPaid: () => void;
  marking: boolean;
}) {
  const isOverdue = sub.overdue_due_date != null;
  const dueDate = sub.overdue_due_date ?? sub.upcoming_due_date;
  // "Paid" means a cycle has actually been confirmed AND nothing's due right
  // now — gated on `last_paid_date` itself, not just date math, so a
  // never-paid subscription that simply isn't due yet doesn't get mislabeled
  // "paid" the way an earlier version of this screen did.
  const isPaid = !isOverdue && sub.last_paid_date != null && sub.upcoming_due_date > todayKey();

  return (
    <Surface radius={t.radius.chip} offset={t.shadowOffset.chip} style={{ padding: t.spacing.md, gap: t.spacing.sm }}>
      <Pressable
        onPress={onEdit}
        style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.md }}
      >
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
      </Pressable>

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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm }}>
          <Pressable onPress={onUnmarkPaid} disabled={marking || !isPaid} hitSlop={6}>
            <Surface
              backgroundColor={isPaid ? t.semantic.red : t.colors.hair}
              offset={0}
              borderWidth={t.border.row}
              radius={t.radius.pill}
              style={{ paddingHorizontal: t.spacing.md, paddingVertical: 6 }}
            >
              <AppText variant="subheading" color={isPaid ? '#FFFFFF' : t.colors.muted} style={{ fontSize: 11 }}>
                Mark as unpaid
              </AppText>
            </Surface>
          </Pressable>
          <Pressable onPress={onMarkPaid} disabled={marking || isPaid} hitSlop={6}>
            <Surface
              backgroundColor={isPaid ? t.colors.hair : t.candy.mint}
              offset={0}
              borderWidth={t.border.row}
              radius={t.radius.pill}
              style={{ paddingHorizontal: t.spacing.md, paddingVertical: 6 }}
            >
              <AppText variant="subheading" color={isPaid ? t.colors.muted : t.candyText} style={{ fontSize: 11 }}>
                Mark as paid
              </AppText>
            </Surface>
          </Pressable>
        </View>
      </View>
    </Surface>
  );
}
