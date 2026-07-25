import { useQueryClient, useMutation } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, useWindowDimensions, View } from 'react-native';

import { createTag } from '@/api/tags';
import {
  createTransaction,
  updateTransaction,
  type Transaction,
  type TransactionInput,
  type TxnType,
} from '@/api/transactions';
import { CalendarIcon } from '@/components/icons';
import { DatePickerSheet } from '@/components/DatePickerSheet';
import { AppText, Button, Chip, TextField } from '@/components/ui';
import { PressableSurface } from '@/components/ui/Surface';
import { useToast } from '@/components/ui/Toast';
import { useAccounts } from '@/hooks/useAccounts';
import { useCategories } from '@/hooks/useCategories';
import { useTags } from '@/hooks/useTags';
import { guessCategory } from '@/lib/categoryGuess';
import { dayKey, formatDayHeader, formatINR, todayKey } from '@/lib/format';
import { categoryVisual } from '@/lib/categoryVisual';
import { useTheme, type Theme } from '@/theme';

/** Indian-grouped display of the in-progress amount string (keeps a typed dot). */
function displayAmount(raw: string): string {
  if (!raw) return '₹0';
  const [intPart, decPart] = raw.split('.');
  const grouped = (intPart || '0').replace(/(\d)(?=(\d\d)+\d$)/g, '$1,');
  return `₹${grouped}${decPart !== undefined ? `.${decPart}` : ''}`;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'] as const;

/**
 * The Add / Edit transaction form shown inside the global bottom sheet. Debit/
 * Credit segment, a big Archivo Black amount driven by a custom keypad, account
 * + category pickers, note (with a smart-category hint), tags, and a date
 * stepper. Save maps to POST/PUT /transactions (tags attach inline via
 * `tag_ids`), then invalidates the transaction + dashboard caches.
 */
export function AddTransactionForm({
  editing,
  onDone,
}: {
  editing?: Transaction | null;
  onDone: () => void;
}) {
  const t = useTheme();
  const toast = useToast();
  const qc = useQueryClient();
  const { height } = useWindowDimensions();

  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories();
  const { data: tags } = useTags();

  const [type, setType] = useState<TxnType>(editing?.type ?? 'debit');
  const [amount, setAmount] = useState<string>(editing ? String(editing.amount) : '');
  const [accountId, setAccountId] = useState<number | null>(editing?.account_id ?? null);
  const [categoryId, setCategoryId] = useState<number | null>(editing?.category_id ?? null);
  const [note, setNote] = useState<string>(editing?.description ?? '');
  const [tagIds, setTagIds] = useState<number[]>(editing?.tags.map((tag) => tag.id) ?? []);
  const [newTagNames, setNewTagNames] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState('');
  const [date, setDate] = useState<string>(editing ? dayKey(editing.txn_date) : todayKey());
  const [dateOpen, setDateOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Default to the first account when creating (once accounts load).
  useEffect(() => {
    if (!editing && accountId == null && accounts && accounts.length > 0) {
      setAccountId(accounts[0].id);
    }
  }, [accounts, accountId, editing]);

  const numericAmount = Number(amount || '0');

  const suggestion = useMemo(
    () => (categoryId == null ? guessCategory(note, categories ?? []) : null),
    [categoryId, note, categories],
  );

  const pressKey = (k: (typeof KEYS)[number]) => {
    setError(null);
    if (k === '⌫') {
      setAmount((a) => a.slice(0, -1));
      return;
    }
    setAmount((a) => {
      if (k === '.') return a.includes('.') ? a : a === '' ? '0.' : `${a}.`;
      const [, dec] = a.split('.');
      if (dec !== undefined && dec.length >= 2) return a; // cap at 2 decimals
      if (a.replace('.', '').length >= 9) return a; // sane upper bound
      return a + k;
    });
  };

  const addTag = () => {
    const name = tagDraft.trim();
    if (!name) return;
    const existing = (tags ?? []).find((tag) => tag.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      if (!tagIds.includes(existing.id)) setTagIds((ids) => [...ids, existing.id]);
    } else if (!newTagNames.some((n) => n.toLowerCase() === name.toLowerCase())) {
      setNewTagNames((n) => [...n, name]);
    }
    setTagDraft('');
  };

  const save = useMutation({
    mutationFn: async () => {
      // Mint any brand-new tags first, then attach every tag id inline.
      const created = await Promise.all(newTagNames.map((name) => createTag(name)));
      const allTagIds = [...tagIds, ...created.map((c) => c.id)];
      const body: TransactionInput = {
        txn_date: `${date}T00:00:00.000Z`,
        description: note.trim(),
        amount: numericAmount,
        type,
        source: 'Manual',
        account_id: accountId as number,
        category_id: categoryId,
        tag_ids: allTagIds,
      };
      return editing ? updateTransaction(editing.id, body) : createTransaction(body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['tags'] });
      toast.show(
        `${editing ? 'Updated' : 'Saved'} ✓ ${type === 'credit' ? '+' : '−'}${formatINR(numericAmount)}`,
      );
      onDone();
    },
    onError: () => setError('Couldn’t save — check your connection and try again.'),
  });

  const onSave = () => {
    setError(null);
    if (numericAmount <= 0) return setError('Enter an amount greater than ₹0.');
    if (!note.trim()) return setError('Add a note so you can recognise this later.');
    if (accountId == null) return setError('Pick an account for this transaction.');
    save.mutate();
  };

  const noAccounts = accounts != null && accounts.length === 0;

  return (
    <View style={{ gap: t.spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <AppText variant="title">{editing ? 'Edit transaction' : 'Add transaction'}</AppText>
        <Segment t={t} value={type} onChange={setType} />
      </View>

      {/* Amount hero + keypad — the money entry, kept together. */}
      <View style={{ alignItems: 'center', paddingVertical: t.spacing.xs }}>
        <AppText
          variant="money"
          color={type === 'credit' ? t.semantic.green : t.colors.ink}
          style={{ fontSize: 44 }}
          numberOfLines={1}
        >
          {type === 'credit' ? '+' : ''}
          {displayAmount(amount)}
        </AppText>
      </View>
      <Keypad t={t} onPress={pressKey} />

      {/* Scrollable detail fields. */}
      <ScrollView
        style={{ maxHeight: height * 0.3 }}
        contentContainerStyle={{ gap: t.spacing.md, paddingBottom: t.spacing.sm }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Account */}
        <Field t={t} label="Account">
          {noAccounts ? (
            <AppText variant="body" tone="muted">
              Add a bank account in Settings first.
            </AppText>
          ) : (
            <ChipScroller t={t}>
              {(accounts ?? []).map((a) => (
                <Chip
                  key={a.id}
                  label={a.name}
                  selected={accountId === a.id}
                  candyColor={t.candy.blue}
                  onPress={() => setAccountId(a.id)}
                />
              ))}
            </ChipScroller>
          )}
        </Field>

        {/* Category + smart hint */}
        <Field t={t} label="Category">
          <ChipScroller t={t}>
            {(categories ?? []).map((c) => {
              const visual = categoryVisual(c.icon_name, c.name);
              return (
                <Chip
                  key={c.id}
                  label={c.name}
                  left={<AppText style={{ fontSize: 12 }}>{visual.emoji}</AppText>}
                  selected={categoryId === c.id}
                  candyColor={visual.color}
                  onPress={() => setCategoryId((id) => (id === c.id ? null : c.id))}
                />
              );
            })}
          </ChipScroller>
          {suggestion ? (
            <Pressable onPress={() => setCategoryId(suggestion.id)} hitSlop={6} style={{ marginTop: 6 }}>
              <AppText variant="link" style={{ fontSize: 12 }}>
                ✨ Auto-detected: {suggestion.name} — tap to use
              </AppText>
            </Pressable>
          ) : null}
        </Field>

        {/* Note */}
        <TextField
          label="Note"
          placeholder="What was it for?"
          value={note}
          onChangeText={setNote}
          autoCapitalize="sentences"
        />

        {/* Tags */}
        <Field t={t} label="Tags">
          <ChipScroller t={t}>
            {(tags ?? []).map((tag) => (
              <Chip
                key={tag.id}
                label={`#${tag.name}`}
                selected={tagIds.includes(tag.id)}
                candyColor={t.candy.pink}
                onPress={() =>
                  setTagIds((ids) =>
                    ids.includes(tag.id) ? ids.filter((x) => x !== tag.id) : [...ids, tag.id],
                  )
                }
              />
            ))}
            {newTagNames.map((name) => (
              <Chip
                key={`new-${name}`}
                label={`#${name}`}
                selected
                candyColor={t.candy.pink}
                onPress={() => setNewTagNames((n) => n.filter((x) => x !== name))}
              />
            ))}
          </ChipScroller>
          <View style={{ flexDirection: 'row', gap: t.spacing.sm, marginTop: t.spacing.sm }}>
            <View style={{ flex: 1 }}>
              <TextField
                placeholder="Add a tag"
                value={tagDraft}
                onChangeText={setTagDraft}
                onSubmitEditing={addTag}
                returnKeyType="done"
                autoCapitalize="none"
              />
            </View>
            <Button label="Add" variant="neutral" fullWidth={false} onPress={addTag} />
          </View>
        </Field>

        {/* Date */}
        <Field t={t} label="Date">
          <PressableSurface
            onPress={() => setDateOpen(true)}
            backgroundColor={t.colors.card}
            borderColor={t.colors.line}
            borderWidth={t.border.row}
            radius={t.radius.pill}
            offset={0}
            style={{
              alignSelf: 'flex-start',
              flexDirection: 'row',
              alignItems: 'center',
              gap: t.spacing.sm,
              paddingVertical: 8,
              paddingHorizontal: t.spacing.md,
            }}
          >
            <CalendarIcon size={16} color={t.colors.ink} />
            <AppText variant="bodySemi" style={{ fontSize: 13 }}>
              {formatDayHeader(`${date}T00:00:00`)}
            </AppText>
          </PressableSurface>
        </Field>
      </ScrollView>

      {error ? (
        <AppText variant="body" color={t.semantic.red} style={{ fontSize: 13 }}>
          {error}
        </AppText>
      ) : null}

      <Button
        label={editing ? 'Save changes' : 'Save transaction'}
        variant="primary"
        loading={save.isPending}
        disabled={noAccounts}
        onPress={onSave}
      />

      <DatePickerSheet
        visible={dateOpen}
        value={date}
        onClose={() => setDateOpen(false)}
        onSelect={(day) => {
          setDate(day);
          setDateOpen(false);
        }}
      />
    </View>
  );
}

/** Debit/Credit two-way segmented toggle. */
function Segment({ t, value, onChange }: { t: Theme; value: TxnType; onChange: (v: TxnType) => void }) {
  const opts: { key: TxnType; label: string; color: string }[] = [
    { key: 'debit', label: 'Spend', color: t.candy.coral },
    { key: 'credit', label: 'Income', color: t.candy.mint },
  ];
  return (
    <View
      style={{
        flexDirection: 'row',
        borderWidth: t.border.row,
        borderColor: t.colors.line,
        borderRadius: t.radius.pill,
        overflow: 'hidden',
      }}
    >
      {opts.map((o) => {
        const active = value === o.key;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            style={{
              paddingVertical: 6,
              paddingHorizontal: t.spacing.md,
              backgroundColor: active ? o.color : t.colors.card,
            }}
          >
            <AppText variant="subheading" color={active ? t.candyText : t.colors.muted} style={{ fontSize: 13 }}>
              {o.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

/** 3×4 numeric keypad. */
function Keypad({ t, onPress }: { t: Theme; onPress: (k: (typeof KEYS)[number]) => void }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm }}>
      {KEYS.map((k) => (
        <PressableSurface
          key={k}
          onPress={() => onPress(k)}
          backgroundColor={t.colors.card}
          radius={t.radius.chip}
          offset={t.shadowOffset.chip}
          style={{ width: '31.5%', alignItems: 'center', justifyContent: 'center', paddingVertical: 14 }}
        >
          <AppText variant="heading" style={{ fontSize: 20 }}>
            {k}
          </AppText>
        </PressableSurface>
      ))}
    </View>
  );
}

/** Labelled field wrapper. */
function Field({ t, label, children }: { t: Theme; label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <AppText variant="label">{label}</AppText>
      {children}
    </View>
  );
}

/**
 * Horizontally scrolling chip row. The content is padded on every side so a
 * selected chip's 2px hard shadow and 1.5px border are never clipped by the
 * scroll viewport, and the last chip clears the sheet's edge.
 */
function ChipScroller({ t, children }: { t: Theme; children: React.ReactNode }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        gap: t.spacing.sm,
        paddingTop: 3,
        paddingBottom: 6, // room for the hard shadow below selected chips
        paddingLeft: 3, // room for border/press travel on the first chip
        paddingRight: t.spacing.lg,
      }}
    >
      {children}
    </ScrollView>
  );
}
