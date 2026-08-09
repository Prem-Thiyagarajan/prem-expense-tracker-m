import { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import type { Subscription, SubscriptionInterval } from '@/api/subscriptions';
import { DatePickerSheet } from '@/components/DatePickerSheet';
import { AppText, Button, TextField, useToast } from '@/components/ui';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { useCreateSubscription, useUpdateSubscription } from '@/hooks/useSubscriptions';
import { apiErrorMessage } from '@/lib/apiError';
import { formatShortDate, todayKey } from '@/lib/format';
import { useTheme } from '@/theme';

type Props = {
  visible: boolean;
  /** The subscription being edited, or null to create a new one. */
  subscription: Subscription | null;
  onClose: () => void;
};

const INTERVALS: { value: SubscriptionInterval; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Biweekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
];

/**
 * Create/edit a subscription. `first_due_date`/`last_paid_date` seed the
 * recurrence anchor on create, but stay editable afterward too — for
 * correcting a mistyped date, which reshapes every future computed due date.
 */
export function SubscriptionEditorSheet({ visible, subscription, onClose }: Props) {
  const t = useTheme();
  const toast = useToast();
  const create = useCreateSubscription();
  const update = useUpdateSubscription();
  const editing = subscription !== null;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [interval, setInterval] = useState<SubscriptionInterval>('monthly');
  const [firstDueDate, setFirstDueDate] = useState(todayKey());
  const [lastPaidDate, setLastPaidDate] = useState<string | null>(null);
  const [pickerField, setPickerField] = useState<'first' | 'last' | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setName(subscription?.name ?? '');
    setDescription(subscription?.description ?? '');
    setAmount(subscription ? String(subscription.amount) : '');
    setInterval(subscription?.interval ?? 'monthly');
    setFirstDueDate(subscription?.first_due_date ?? todayKey());
    setLastPaidDate(subscription?.last_paid_date ?? null);
    setError(null);
  }, [visible, subscription]);

  const onSave = async () => {
    const trimmedName = name.trim();
    const parsedAmount = Number(amount);
    if (!trimmedName) return setError('Give the subscription a name');
    if (!amount || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      return setError('Enter a valid amount');
    }
    setError(null);
    try {
      if (editing) {
        await update.mutateAsync({
          id: subscription.id,
          input: {
            name: trimmedName,
            description: description.trim() || null,
            amount: parsedAmount,
            interval,
            first_due_date: firstDueDate,
            last_paid_date: lastPaidDate,
          },
        });
        toast.show('Subscription updated ✓');
      } else {
        await create.mutateAsync({
          name: trimmedName,
          description: description.trim() || null,
          amount: parsedAmount,
          interval,
          first_due_date: firstDueDate,
          last_paid_date: lastPaidDate,
        });
        toast.show('Subscription added ✓');
      }
      onClose();
    } catch (e) {
      setError(apiErrorMessage(e, 'Could not save the subscription'));
    }
  };

  return (
    <>
      <BottomSheet visible={visible} onClose={onClose}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ gap: t.spacing.md, paddingBottom: t.spacing.sm }}
        >
          <AppText variant="title" style={{ fontSize: 18 }}>
            {editing ? 'Edit subscription' : 'New subscription'}
          </AppText>

          <TextField
            label="Name"
            placeholder="e.g. Netflix"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />

          <TextField
            label="Description (optional)"
            placeholder="e.g. Family plan"
            value={description}
            onChangeText={setDescription}
          />

          <TextField
            label="Amount"
            placeholder="e.g. 649"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
          />

          <View style={{ gap: 6 }}>
            <AppText variant="label">Bills</AppText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm }}>
              {INTERVALS.map((opt) => {
                const selected = interval === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => setInterval(opt.value)}
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
                      {opt.label}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <DateField
            label={editing ? 'First due date' : "This month's payment date"}
            value={firstDueDate}
            onPress={() => setPickerField('first')}
          />
          <DateField
            label={editing ? 'Last confirmed paid (optional)' : "Last month's payment date (optional)"}
            value={lastPaidDate}
            onPress={() => setPickerField('last')}
            onClear={lastPaidDate ? () => setLastPaidDate(null) : undefined}
          />

          {error ? (
            <AppText variant="body" color={t.semantic.red} style={{ fontSize: 12 }}>
              {error}
            </AppText>
          ) : null}

          <Button
            label={editing ? 'Save changes' : 'Add subscription'}
            variant="primary"
            loading={create.isPending || update.isPending}
            onPress={onSave}
            style={{ marginTop: t.spacing.xs }}
          />
        </ScrollView>
      </BottomSheet>

      <DatePickerSheet
        visible={pickerField != null}
        value={(pickerField === 'first' ? firstDueDate : lastPaidDate) ?? todayKey()}
        allowFuture
        onClose={() => setPickerField(null)}
        onSelect={(day) => {
          if (pickerField === 'first') setFirstDueDate(day);
          else setLastPaidDate(day);
          setPickerField(null);
        }}
      />
    </>
  );
}

function DateField({
  label,
  value,
  onPress,
  onClear,
}: {
  label: string;
  value: string | null;
  onPress: () => void;
  onClear?: () => void;
}) {
  const t = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <AppText variant="label">{label}</AppText>
      <Pressable
        onPress={onPress}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: t.colors.card,
          borderWidth: t.border.card,
          borderColor: t.colors.line,
          borderRadius: t.radius.chip,
          paddingHorizontal: t.spacing.md,
          paddingVertical: 13,
        }}
      >
        <AppText variant="bodyMedium" color={value ? t.colors.ink : t.colors.faint}>
          {value ? formatShortDate(value) : 'Select a date'}
        </AppText>
        {onClear ? (
          <Pressable onPress={onClear} hitSlop={8}>
            <AppText variant="body" tone="link" style={{ fontSize: 12 }}>
              Clear
            </AppText>
          </Pressable>
        ) : null}
      </Pressable>
    </View>
  );
}
