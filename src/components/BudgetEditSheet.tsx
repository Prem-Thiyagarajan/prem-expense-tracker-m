import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, useWindowDimensions, View } from 'react-native';

import type { CategoryBudget, SuggestedBudget } from '@/api/budget';
import type { Category } from '@/api/categories';
import { CategoryBadge } from '@/components/CategoryBadge';
import { AppText, BottomSheet, Button, TextField } from '@/components/ui';
import { useSaveBudget } from '@/hooks/useBudget';
import { formatINR } from '@/lib/format';
import { useTheme } from '@/theme';

/** Surfaces the backend's `detail` string (already user-friendly) or a fallback. */
function apiErrorMessage(e: unknown, fallback: string): string {
  const detail = (e as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail[0]?.msg) return String(detail[0].msg);
  return fallback;
}

type Props = {
  visible: boolean;
  onClose: () => void;
  month: string;
  monthLabel: string;
  categories: Category[];
  currentPlan: CategoryBudget[] | null;
  suggestions: SuggestedBudget[] | null;
  onSaved: () => void;
};

/**
 * Per-category limit editor. Sends every non-income category on save (not just
 * the ones with a value) — the backend upserts-or-deletes per item, so a
 * category left at 0 correctly clears any existing limit for it.
 */
export function BudgetEditSheet({
  visible,
  onClose,
  month,
  monthLabel,
  categories,
  currentPlan,
  suggestions,
  onSaved,
}: Props) {
  const t = useTheme();
  const { height: windowHeight } = useWindowDimensions();
  const saveBudget = useSaveBudget(month);
  const [amounts, setAmounts] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);

  // Each row's y-offset inside the list, so focusing a field can bring that row
  // into view instead of leaving it stranded behind the keyboard.
  const scrollRef = useRef<ScrollView>(null);
  const rowOffsets = useRef<Record<number, number>>({});

  const revealRow = (categoryId: number) => {
    const y = rowOffsets.current[categoryId];
    if (y == null) return;
    scrollRef.current?.scrollTo({ y: Math.max(0, y - t.spacing.sm), animated: true });
  };

  // Reset drafts from the current plan each time the sheet opens.
  useEffect(() => {
    if (!visible) return;
    const initial: Record<number, string> = {};
    for (const b of currentPlan ?? []) {
      if (b.budget > 0) initial[b.categoryId] = String(b.budget);
    }
    setAmounts(initial);
    setError(null);
  }, [visible, currentPlan]);

  const expenseCategories = categories.filter((c) => !c.is_income);

  const onSave = async () => {
    setError(null);
    const budgets = expenseCategories.map((c) => ({
      category_id: c.id,
      limit_amount: Number(amounts[c.id]) || 0,
    }));
    try {
      await saveBudget.mutateAsync(budgets);
      onSaved();
      onClose();
    } catch (e) {
      setError(apiErrorMessage(e, 'Could not save your budget'));
    }
  };

  return (
    // Cap the sheet in real pixels: a percentage height can't resolve against
    // BottomSheet's content-sized panel, which is what left dead space below
    // the footer. With a bounded panel the list shrinks and the button pins.
    <BottomSheet visible={visible} onClose={onClose} style={{ maxHeight: windowHeight * 0.85 }}>
      <AppText variant="title" style={{ fontSize: 18 }}>
        Set limits for {monthLabel}
      </AppText>

      <AppText variant="body" tone="muted" style={{ marginTop: t.spacing.sm }}>
        Leave a category at 0 to skip it. Setting an existing limit back to 0 removes it.
      </AppText>

      {/* Only this list scrolls; it shrinks to whatever space the header and
          pinned footer leave, so as many rows as fit stay visible. */}
      <ScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        style={{ flexShrink: 1, marginTop: t.spacing.md }}
        contentContainerStyle={{ paddingBottom: t.spacing.md }}
      >
        <View style={{ gap: t.spacing.sm }}>
          {expenseCategories.map((cat) => {
            const suggestion = suggestions?.find((s) => s.categoryId === cat.id);
            return (
              <View
                key={cat.id}
                onLayout={(e) => {
                  rowOffsets.current[cat.id] = e.nativeEvent.layout.y;
                }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm }}
              >
                <CategoryBadge iconName={cat.icon_name} name={cat.name} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <AppText variant="bodyMedium" numberOfLines={1}>
                    {cat.name}
                  </AppText>
                  {suggestion && suggestion.suggestedAmount > 0 ? (
                    <Pressable
                      onPress={() =>
                        setAmounts((prev) => ({ ...prev, [cat.id]: String(suggestion.suggestedAmount) }))
                      }
                      hitSlop={6}
                    >
                      <AppText variant="link" style={{ fontSize: 11 }}>
                        Use suggested {formatINR(suggestion.suggestedAmount)}
                      </AppText>
                    </Pressable>
                  ) : null}
                </View>
                <View style={{ width: 92 }}>
                  <TextField
                    value={amounts[cat.id] ?? ''}
                    onChangeText={(v) => setAmounts((prev) => ({ ...prev, [cat.id]: v.replace(/[^0-9]/g, '') }))}
                    onFocus={() => revealRow(cat.id)}
                    keyboardType="number-pad"
                    placeholder="0"
                    returnKeyType="done"
                    style={{ textAlign: 'right' }}
                  />
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Pinned footer — never scrolls away. BottomSheet already pads for the
          safe-area inset, so the button clears device navigation bars. */}
      {error ? (
        <AppText variant="body" color={t.semantic.red} style={{ fontSize: 12, marginTop: t.spacing.sm }}>
          {error}
        </AppText>
      ) : null}

      <Button
        label="Save budget"
        variant="candy"
        candyColor={t.candy.yellow}
        loading={saveBudget.isPending}
        onPress={onSave}
        style={{ marginTop: t.spacing.md }}
      />
    </BottomSheet>
  );
}
