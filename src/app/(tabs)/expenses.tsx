import { useIsFocused } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, startTransition } from 'react';
import { Animated, Pressable, RefreshControl, ScrollView, SectionList, View } from 'react-native';
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Account } from '@/api/accounts';
import type { Category } from '@/api/categories';
import { invalidateTransactionDerived } from '@/api/queryClient';
import { deleteTransaction, type Transaction, type TxnType } from '@/api/transactions';
import { useAuth } from '@/auth/AuthProvider';
import { AssistantButton } from '@/components/assistant/AssistantButton';
import { AlertBell } from '@/components/AlertBell';
import { useAddSheet } from '@/components/AddSheetHost';
import { CategoryGridSheet } from '@/components/CategoryGridSheet';
import { MonthSwitcher } from '@/components/MonthSwitcher';
import { AppText, Button, Card, Chip, TextField } from '@/components/ui';
import { PressableSurface, Surface } from '@/components/ui/Surface';
import { useToast } from '@/components/ui/Toast';
import { useAccounts } from '@/hooks/useAccounts';
import { useCategories } from '@/hooks/useCategories';
import { useTransactions } from '@/hooks/useTransactions';
import { categoryVisual } from '@/lib/categoryVisual';
import { dayKey, formatDayHeader, formatINR } from '@/lib/format';
import { cleanMerchant } from '@/lib/merchant';
import { useMonth } from '@/state/MonthProvider';
import { useTheme, type Theme } from '@/theme';

type TypeFilter = 'all' | TxnType;
type Section = { key: string; iso: string; total: number; data: Transaction[] };

/**
 * Group transactions into per-day sections, preserving the server's newest-first
 * order (both across days and within a day). The header total is the day's
 * spending (sum of debits) — income rows still list but don't inflate the total.
 */
function buildSections(txns: Transaction[]): Section[] {
  const byDay = new Map<string, Section>();
  for (const txn of txns) {
    const key = dayKey(txn.txn_date);
    let sec = byDay.get(key);
    if (!sec) {
      sec = { key, iso: txn.txn_date, total: 0, data: [] };
      byDay.set(key, sec);
    }
    sec.data.push(txn);
    if (txn.type === 'debit') sec.total += txn.amount;
  }
  return Array.from(byDay.values());
}

export default function ExpensesScreen() {
  const t = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const { month, label } = useMonth();
  const params = useLocalSearchParams<{ categoryId?: string }>();

  const initial = user?.username?.[0]?.toUpperCase() ?? '?';

  const q = useTransactions(month);
  const { data: categories } = useCategories();
  const { data: accounts } = useAccounts();

  const categoryById = useMemo(
    () => new Map<number, Category>((categories ?? []).map((c) => [c.id, c])),
    [categories],
  );
  const accountById = useMemo(
    () => new Map<number, Account>((accounts ?? []).map((a) => [a.id, a])),
    [accounts],
  );

  const qc = useQueryClient();
  const toast = useToast();
  const { openEdit } = useAddSheet();

  // Filter state — all applied client-side against the month's full result set.
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [categoryId, setCategoryId] = useState<number | null>(
    params.categoryId ? Number(params.categoryId) : null,
  );
  const [search, setSearch] = useState('');
  const [gridOpen, setGridOpen] = useState(false);

  // Deep-linked from another tab (e.g. tapping a category on Budget) — apply
  // it as the filter each time it arrives, even if this screen is already
  // mounted from a previous visit.
  useEffect(() => {
    if (!params.categoryId) return;
    const id = Number(params.categoryId);
    if (!Number.isNaN(id)) setCategoryId(id);
  }, [params.categoryId]);

  // Delete-with-undo: the pending row is hidden immediately and only actually
  // DELETEd after a 5s grace, so "Undo" fully cancels it (no network call made).
  const [pending, setPending] = useState<Transaction | null>(null);
  const pendingRef = useRef<{ txn: Transaction; timer: ReturnType<typeof setTimeout> } | null>(null);

  const commitDelete = useCallback(
    (txn: Transaction) => {
      deleteTransaction(txn.id)
        .then(() => invalidateTransactionDerived(qc))
        .catch(() => toast.show('Couldn’t delete — pull to refresh.'));
    },
    [qc, toast],
  );

  const requestDelete = useCallback(
    (txn: Transaction) => {
      // If another delete is already waiting out its grace, commit it now.
      if (pendingRef.current) {
        clearTimeout(pendingRef.current.timer);
        commitDelete(pendingRef.current.txn);
      }
      const timer = setTimeout(() => {
        pendingRef.current = null;
        setPending(null);
        commitDelete(txn);
      }, 5000);
      pendingRef.current = { txn, timer };
      setPending(txn);
    },
    [commitDelete],
  );

  const undoDelete = useCallback(() => {
    if (pendingRef.current) clearTimeout(pendingRef.current.timer);
    pendingRef.current = null;
    setPending(null);
  }, []);

  // Leaving the screen with a delete still pending accepts it — commit now.
  useEffect(
    () => () => {
      if (pendingRef.current) {
        clearTimeout(pendingRef.current.timer);
        commitDelete(pendingRef.current.txn);
        pendingRef.current = null;
      }
    },
    [commitDelete],
  );

  const all = useMemo(() => q.data?.transactions ?? [], [q.data]);
  const pendingId = pending?.id ?? null;

  // Per-category counts for the grid — always from the unfiltered month.
  const counts = useMemo(() => {
    const m = new Map<number, number>();
    for (const r of all) {
      if (r.category_id != null) m.set(r.category_id, (m.get(r.category_id) ?? 0) + 1);
    }
    return m;
  }, [all]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return all.filter((r) => {
      if (r.id === pendingId) return false; // hidden during its undo grace
      if (typeFilter !== 'all' && r.type !== typeFilter) return false;
      if (categoryId != null && r.category_id !== categoryId) return false;
      if (term) {
        const hay = `${r.description ?? ''} ${cleanMerchant(r.description)}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [all, typeFilter, categoryId, search, pendingId]);

  const sections = useMemo(() => buildSections(filtered), [filtered]);

  // The SectionList is the single most expensive render in the app — each row
  // is a ReanimatedSwipeable, and a month change replaces the whole array, so
  // every row's gesture handler and layout gets rebuilt at once (this is what
  // RN's own "large list slow to update" warning was tracing back to, and it
  // was blocking the JS thread badly enough to stall unrelated network
  // callbacks on other tabs). Freezing the data this tab renders while it's
  // blurred — syncing only on focus — skips that cost for the 3 out of 4
  // month-changes where this tab isn't visible. Kept as a live ref rather than
  // unmounting the list so scroll position and swipe/expanded state survive
  // switching tabs and back.
  const [visibleSections, setVisibleSections] = useState(sections);
  // TEMP: measures how long the swap itself takes to commit, to tell whether
  // the 1.5-2s delay is React/JS-side (this number) or something after it
  // (native view mounting, bridge traffic) that JS-side scheduling can't fix.
  const swapStartedAt = useRef<number | null>(null);
  useEffect(() => {
    if (!isFocused) return;
    swapStartedAt.current = Date.now();
    startTransition(() => setVisibleSections(sections));
  }, [isFocused, sections]);
  useEffect(() => {
    if (swapStartedAt.current == null) return;
    const elapsed = Date.now() - swapStartedAt.current;
    if (__DEV__) {
      console.log(`[expenses] visibleSections committed after ${elapsed}ms (${visibleSections.length} sections)`);
    }
    swapStartedAt.current = null;
  }, [visibleSections]);

  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const toggle = useCallback((id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const total = q.data?.totalCount ?? 0;
  const filtersActive = typeFilter !== 'all' || categoryId != null || search.trim() !== '';
  const refreshing = q.isFetching && !q.isLoading;

  // This screen's header is fixed rather than scrolling, so it gets the rule
  // that `StatusBarScrim` draws on the other tabs — same signal ("a fixed layer
  // sits above the content"), attached to the header instead of the notch band.
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerRule = scrollY.interpolate({
    inputRange: [0, 14],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const selectedCategory = categoryId != null ? categoryById.get(categoryId) : undefined;

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg, paddingTop: insets.top + t.spacing.sm }}>
      {/* Fixed header: title · month · count · search · filter chips. */}
      <View style={{ paddingHorizontal: t.spacing.lg, gap: t.spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Every tab leads with its own tilted sticker tile — the app mark on
              Home, then 🧾 Expenses, 🎯 Budget, 📊 Trends — and no page-name
              label, to stay uniform with the other three tabs' headers. */}
          <Surface
            backgroundColor={t.candy.mint}
            offset={t.shadowOffset.chip}
            radius={t.radius.chip}
            style={{
              width: 40,
              height: 40,
              alignItems: 'center',
              justifyContent: 'center',
              transform: [{ rotate: '-6deg' }],
            }}
          >
            <AppText style={{ fontSize: 20 }}>🧾</AppText>
          </Surface>

          <MonthSwitcher />

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm }}>
            <AssistantButton />
            <AlertBell />
            <Pressable onPress={() => router.push('/profile' as Href)} hitSlop={6}>
              <Surface
                backgroundColor={t.candy.pink}
                offset={t.shadowOffset.chip}
                radius={999}
                style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
              >
                <AppText variant="heading" color={t.candyText}>
                  {initial}
                </AppText>
              </Surface>
            </Pressable>
          </View>
        </View>
        <AppText variant="label">
          {filtersActive ? `${filtered.length} of ${total}` : total} {total === 1 ? 'transaction' : 'transactions'} · {label}
        </AppText>

        <TextField
          placeholder="Search this month"
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          autoCorrect={false}
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: t.spacing.sm, paddingVertical: 2, paddingRight: t.spacing.lg }}
        >
          <Chip
            label="All"
            selected={typeFilter === 'all'}
            candyColor={t.candy.yellow}
            onPress={() => setTypeFilter('all')}
          />
          <Chip
            label="Spending"
            selected={typeFilter === 'debit'}
            candyColor={t.candy.coral}
            onPress={() => setTypeFilter('debit')}
          />
          <Chip
            label="Income"
            selected={typeFilter === 'credit'}
            candyColor={t.candy.mint}
            onPress={() => setTypeFilter('credit')}
          />
          <Chip
            label={selectedCategory ? selectedCategory.name : 'Category'}
            left={<AppText style={{ fontSize: 13 }}>⊞</AppText>}
            selected={categoryId != null}
            candyColor={t.candy.lilac}
            onPress={() => setGridOpen(true)}
          />
        </ScrollView>

        {/* Full-bleed rule that fades in once the list slides beneath. */}
        <Animated.View
          style={{
            height: t.border.row,
            marginHorizontal: -t.spacing.lg,
            backgroundColor: t.colors.line,
            opacity: headerRule,
          }}
        />
      </View>

      {q.isLoading ? (
        <ExpensesSkeleton t={t} />
      ) : q.isError ? (
        <View style={{ padding: t.spacing.lg }}>
          <ErrorCard t={t} onRetry={q.refetch} retrying={refreshing} />
        </View>
      ) : total === 0 ? (
        <View style={{ padding: t.spacing.lg }}>
          <EmptyCard t={t} label={label} />
        </View>
      ) : visibleSections.length === 0 ? (
        <View style={{ padding: t.spacing.lg }}>
          <NoMatchesCard t={t} onClear={() => { setTypeFilter('all'); setCategoryId(null); setSearch(''); }} />
        </View>
      ) : (
        <SectionList
          sections={visibleSections}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{
            paddingHorizontal: t.spacing.lg,
            paddingTop: t.spacing.sm,
            paddingBottom: 120 + insets.bottom,
          }}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          scrollEventThrottle={16}
          // A month swap replaces every row at once (each one a
          // ReanimatedSwipeable), so keep each render batch small and let
          // far-offscreen rows unmount rather than trying to build them all
          // in one pass.
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          updateCellsBatchingPeriod={30}
          windowSize={7}
          removeClippedSubviews
          onScroll={(e) => scrollY.setValue(e.nativeEvent.contentOffset.y)}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={q.refetch} tintColor={t.colors.muted} />
          }
          renderSectionHeader={({ section }) => (
            <DayHeader t={t} iso={section.iso} total={section.total} />
          )}
          renderItem={({ item }) => (
            <TxnRow
              t={t}
              txn={item}
              category={item.category_id != null ? categoryById.get(item.category_id) : undefined}
              account={accountById.get(item.account_id)}
              expanded={expanded.has(item.id)}
              onToggle={toggle}
              onEdit={openEdit}
              onDelete={requestDelete}
            />
          )}
          ListFooterComponent={
            q.data?.truncated ? (
              <AppText
                variant="body"
                tone="faint"
                style={{ textAlign: 'center', marginTop: t.spacing.lg, fontSize: 12 }}
              >
                Showing the latest {all.length} of {total}. Narrow by category or search.
              </AppText>
            ) : null
          }
        />
      )}

      {pending ? (
        <UndoBar t={t} insetBottom={insets.bottom} txn={pending} onUndo={undoDelete} />
      ) : null}

      <CategoryGridSheet
        visible={gridOpen}
        onClose={() => setGridOpen(false)}
        categories={categories ?? []}
        counts={counts}
        total={total}
        selectedId={categoryId}
        onSelect={setCategoryId}
      />
    </View>
  );
}

/** Bottom snackbar shown during a delete's undo grace. */
function UndoBar({
  t,
  insetBottom,
  txn,
  onUndo,
}: {
  t: Theme;
  insetBottom: number;
  txn: Transaction;
  onUndo: () => void;
}) {
  return (
    <View
      style={{
        position: 'absolute',
        left: t.spacing.lg,
        right: t.spacing.lg,
        bottom: insetBottom + 96, // above the floating tab bar
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: t.spacing.md,
        backgroundColor: t.colors.ink,
        borderRadius: t.radius.pill,
        paddingVertical: 12,
        paddingHorizontal: 18,
      }}
    >
      <AppText variant="bodySemi" color={t.colors.bg} numberOfLines={1} style={{ flex: 1 }}>
        Deleted {cleanMerchant(txn.description)}
      </AppText>
      <Pressable onPress={onUndo} hitSlop={8}>
        <AppText variant="heading" color={t.candy.yellow} style={{ fontSize: 14 }}>
          Undo
        </AppText>
      </Pressable>
    </View>
  );
}

/** Ruled day header: label on the left, day's spend on the right, hairline rule. */
function DayHeader({ t, iso, total }: { t: Theme; iso: string; total: number }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        marginTop: t.spacing.lg,
        paddingBottom: t.spacing.xs,
        borderBottomWidth: t.border.row,
        borderBottomColor: t.colors.hair,
        backgroundColor: t.colors.bg,
      }}
    >
      <AppText variant="subheading">{formatDayHeader(iso)}</AppText>
      {total > 0 ? <AppText variant="label">{formatINR(total)} spent</AppText> : null}
    </View>
  );
}

function TxnRow({
  t,
  txn,
  category,
  account,
  expanded,
  onToggle,
  onEdit,
  onDelete,
}: {
  t: Theme;
  txn: Transaction;
  category?: Category;
  account?: Account;
  expanded: boolean;
  onToggle: (id: number) => void;
  onEdit: (txn: Transaction) => void;
  onDelete: (txn: Transaction) => void;
}) {
  const visual = categoryVisual(category?.icon_name, category?.name);
  const isCredit = txn.type === 'credit';
  const subtitle = `${category?.name ?? 'Uncategorized'} · ${account?.name ?? 'Account'}`;
  const swipeRef = useRef<SwipeableMethods | null>(null);

  const renderRightActions = () => (
    <View style={{ flexDirection: 'row', height: '100%' }}>
      <ActionButton
        t={t}
        color={t.candy.blue}
        textColor={t.candyText}
        label="Edit"
        onPress={() => {
          swipeRef.current?.close();
          onEdit(txn);
        }}
      />
      <ActionButton
        t={t}
        color={t.semantic.red}
        textColor="#FFFFFF"
        label="Delete"
        onPress={() => {
          swipeRef.current?.close();
          onDelete(txn);
        }}
      />
    </View>
  );

  return (
    <View style={{ marginTop: t.spacing.sm }}>
      <ReanimatedSwipeable
        ref={swipeRef}
        friction={2}
        rightThreshold={40}
        overshootRight={false}
        renderRightActions={renderRightActions}
        containerStyle={{ borderRadius: t.radius.chip }}
      >
        {/* Opaque cream fill so the actions stay hidden until swiped. */}
        <PressableSurface
          offset={0}
          borderWidth={0}
          backgroundColor={t.colors.bg}
          radius={t.radius.chip}
          pressTravel={0}
          onPress={() => onToggle(txn.id)}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.md }}>
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                backgroundColor: visual.color,
                borderWidth: t.border.row,
                borderColor: t.colors.ink,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AppText style={{ fontSize: 18 }}>{visual.emoji}</AppText>
            </View>

            <View style={{ flex: 1, paddingRight: t.spacing.sm }}>
              <AppText variant="heading" numberOfLines={1}>
                {cleanMerchant(txn.description)}
              </AppText>
              <AppText variant="body" tone="muted" numberOfLines={1} style={{ fontSize: 12, marginTop: 1 }}>
                {subtitle}
              </AppText>
            </View>

            <AppText
              variant="money"
              color={isCredit ? t.semantic.green : t.colors.ink}
              style={{ fontSize: 16 }}
            >
              {isCredit ? '+' : ''}
              {formatINR(txn.amount)}
            </AppText>
          </View>
        </PressableSurface>
      </ReanimatedSwipeable>

      {expanded ? <RawWell t={t} txn={txn} /> : null}
    </View>
  );
}

/** A single swipe-reveal action (Edit / Delete). */
function ActionButton({
  t,
  color,
  textColor,
  label,
  onPress,
}: {
  t: Theme;
  color: string;
  textColor: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        width: 76,
        height: '100%',
        backgroundColor: color,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <AppText variant="heading" color={textColor} style={{ fontSize: 13 }}>
        {label}
      </AppText>
    </Pressable>
  );
}

/** Expanded detail: the raw narration in a dashed mono well, ref + tags. */
function RawWell({ t, txn }: { t: Theme; txn: Transaction }) {
  return (
    <View
      style={{
        marginTop: t.spacing.sm,
        marginLeft: 38 + t.spacing.md, // align under the text column, past the badge
        padding: t.spacing.md,
        borderRadius: t.radius.chip,
        borderWidth: t.border.row,
        borderColor: t.colors.hair,
        borderStyle: 'dashed',
        backgroundColor: t.colors.hair,
        gap: 6,
      }}
    >
      <AppText variant="label" tone="faint">
        Raw narration
      </AppText>
      <AppText variant="mono">{txn.description}</AppText>
      {txn.upi_ref ? (
        <AppText variant="mono" tone="faint">
          UPI ref · {txn.upi_ref}
        </AppText>
      ) : null}
      {txn.tags.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.xs, marginTop: 2 }}>
          {txn.tags.map((tag) => (
            <View
              key={tag.id}
              style={{
                paddingHorizontal: t.spacing.sm,
                paddingVertical: 2,
                borderRadius: t.radius.pill,
                borderWidth: t.border.row,
                borderColor: t.colors.line,
                backgroundColor: t.colors.card,
              }}
            >
              <AppText variant="body" style={{ fontSize: 11 }}>
                #{tag.name}
              </AppText>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function EmptyCard({ t, label }: { t: Theme; label: string }) {
  return (
    <Card background={t.candy.mint} style={{ alignItems: 'center', paddingVertical: t.spacing.xl }}>
      <AppText style={{ fontSize: 34 }}>🧾</AppText>
      <AppText variant="heading" color={t.candyText} style={{ marginTop: t.spacing.sm }}>
        No transactions in {label}
      </AppText>
      <AppText variant="bodyMedium" color={t.candyText} style={{ marginTop: 4, textAlign: 'center' }}>
        Add one with the ＋ button, or pick another month.
      </AppText>
    </Card>
  );
}

function NoMatchesCard({ t, onClear }: { t: Theme; onClear: () => void }) {
  return (
    <Card style={{ alignItems: 'center', paddingVertical: t.spacing.xl }}>
      <AppText style={{ fontSize: 30 }}>🔍</AppText>
      <AppText variant="heading" style={{ marginTop: t.spacing.sm }}>
        No matches
      </AppText>
      <AppText variant="bodyMedium" tone="muted" style={{ marginTop: 4, textAlign: 'center' }}>
        Nothing matches these filters this month.
      </AppText>
      <View style={{ marginTop: t.spacing.md }}>
        <Button label="Clear filters" variant="neutral" fullWidth={false} onPress={onClear} />
      </View>
    </Card>
  );
}

function ErrorCard({ t, onRetry, retrying }: { t: Theme; onRetry: () => void; retrying: boolean }) {
  return (
    <Card background={t.candy.coral}>
      <AppText variant="heading" color={t.candyText}>
        Couldn’t load transactions
      </AppText>
      <AppText variant="bodyMedium" color={t.candyText} style={{ marginTop: 4 }}>
        Check your connection and try again.
      </AppText>
      <View style={{ marginTop: t.spacing.md }}>
        <Button
          label={retrying ? 'Retrying…' : 'Retry'}
          variant="primary"
          onPress={onRetry}
          disabled={retrying}
        />
      </View>
    </Card>
  );
}

/** Rhythm-matching placeholder rows while the first page loads. */
function ExpensesSkeleton({ t }: { t: Theme }) {
  return (
    <View style={{ paddingHorizontal: t.spacing.lg, paddingTop: t.spacing.lg, gap: t.spacing.md }}>
      <View style={{ height: 16, width: 120, borderRadius: 6, backgroundColor: t.colors.hair }} />
      {Array.from({ length: 6 }).map((_, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.md }}>
          <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: t.colors.hair }} />
          <View style={{ flex: 1, gap: 6 }}>
            <View style={{ height: 14, width: '55%', borderRadius: 5, backgroundColor: t.colors.hair }} />
            <View style={{ height: 11, width: '38%', borderRadius: 5, backgroundColor: t.colors.hair }} />
          </View>
          <View style={{ height: 16, width: 60, borderRadius: 5, backgroundColor: t.colors.hair }} />
        </View>
      ))}
    </View>
  );
}
