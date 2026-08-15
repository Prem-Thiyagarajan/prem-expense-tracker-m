import { useIsFocused } from '@react-navigation/native';
import { useRouter, type Href } from 'expo-router';
import { Pressable, View } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { AssistantButton } from '@/components/assistant/AssistantButton';
import { AlertBell } from '@/components/AlertBell';
import { CategoryDonut, SpendTrend } from '@/components/charts';
import { MonthSwitcher } from '@/components/MonthSwitcher';
import { AppMark, AppText, Button, Card, Screen } from '@/components/ui';
import { Surface } from '@/components/ui/Surface';
import { useDashboard } from '@/hooks/useDashboard';
import type { RecentTransaction } from '@/api/dashboard';
import { formatINR, formatShortDate } from '@/lib/format';
import { useMonth } from '@/state/MonthProvider';
import { useTheme, type Theme } from '@/theme';

export default function HomeScreen() {
  const t = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const isFocused = useIsFocused();
  const { month, label } = useMonth();
  const { data, isLoading, isError, refetch, isRefetching, isPlaceholderData } = useDashboard(month);

  const initial = user?.username?.[0]?.toUpperCase() ?? '?';

  // Recent activity is a teaser for the Expenses tab. `navigate` rather than
  // `push` so repeat taps switch tabs instead of stacking duplicate screens.
  const openExpenses = () => router.navigate('/expenses' as Href);

  // A month is "empty" when it has no spending. We key off totalSpent alone
  // because the backend's recentTransactions list is global-latest (not
  // month-scoped), so it's non-empty even for months with zero activity.
  const isEmpty = !!data && data.totalSpent === 0;

  return (
    <Screen>
      <View style={{ gap: t.spacing.lg }}>
        {/* Header: logo tile · month control · avatar → profile */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Surface
            backgroundColor={t.brand.field}
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
            <AppMark size={30} variant="lime" />
          </Surface>

          <MonthSwitcher />

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm }}>
            <AssistantButton />
            <AlertBell />
            {/* Cast: expo-router's generated route types pick up profile.tsx once
                the dev server regenerates them; the literal is valid at runtime. */}
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

        {isLoading || !isFocused ? (
          // Skipping the real content while blurred is what keeps arrow-tap
          // navigation fast: charts/lists on the other three tabs would
          // otherwise re-render on every month change even though nobody's
          // looking at them. Data still fetches live (below) so the numbers
          // are correct the instant this tab regains focus.
          <DashboardSkeleton t={t} />
        ) : isError ? (
          <ErrorCard t={t} onRetry={refetch} retrying={isRefetching} />
        ) : isEmpty ? (
          <EmptyCard t={t} label={label} />
        ) : data ? (
          // Dimmed while the previous month's data is still on screen, so a
          // stale figure is never shown as if it belonged to the header's month.
          <View style={{ gap: t.spacing.lg, opacity: isPlaceholderData ? 0.45 : 1 }}>
            {/* Hero: total spent this month + change vs last month */}
            <Card background={t.candy.mint}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <AppText variant="label" color={t.candyText}>
                  Spent in {label}
                </AppText>
                <ChangePill t={t} pct={data.percentChangeFromLastMonth} />
              </View>
              <AppText
                variant="money"
                color={t.candyText}
                style={{ fontSize: 46, marginTop: t.spacing.sm }}
              >
                {formatINR(data.totalSpent)}
              </AppText>
            </Card>

            {/* KPI row */}
            <View style={{ flexDirection: 'row', gap: t.spacing.md }}>
              <KpiCard t={t} label="Daily avg" value={formatINR(data.dailyAverageSpend)} />
              <KpiCard t={t} label="Projected" value={formatINR(data.projectedMonthlySpend)} />
            </View>

            {/* Spending trend — cumulative spend across the month (interactive) */}
            {data.spendingTrend.length >= 2 &&
              data.spendingTrend.some((p) => p.cumulative_spend > 0) && (
                <Card>
                  <SpendTrend t={t} title="Spending trend" data={data.spendingTrend} />
                </Card>
              )}

            {/* Category split — each category's share of total spend */}
            {data.topSpendingCategories.length > 0 && (
              <Card>
                <AppText variant="label">Category split</AppText>
                <View style={{ marginTop: t.spacing.md }}>
                  <CategoryDonut
                    t={t}
                    data={data.topSpendingCategories}
                    total={data.totalSpent}
                    centerLabel={label}
                  />
                </View>
              </Card>
            )}

            {/* Recent activity — most recent 4; anywhere here opens Expenses */}
            {data.recentTransactions.length > 0 && (
              <Card>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                  }}
                >
                  <AppText variant="label">Recent activity</AppText>
                  <Pressable onPress={openExpenses} hitSlop={8}>
                    <AppText variant="link" style={{ fontSize: 12 }}>
                      View all →
                    </AppText>
                  </Pressable>
                </View>
                <View style={{ marginTop: t.spacing.sm }}>
                  {data.recentTransactions.slice(0, 4).map((txn, i, shown) => (
                    <TxnRow
                      key={txn.id}
                      t={t}
                      txn={txn}
                      last={i === shown.length - 1}
                      onPress={openExpenses}
                    />
                  ))}
                </View>
              </Card>
            )}
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

/** Small pill showing month-over-month change; green when spending fell. */
function ChangePill({ t, pct }: { t: Theme; pct: number }) {
  const flat = Math.round(pct) === 0;
  const up = pct > 0;
  const color = flat ? t.colors.muted : up ? t.semantic.red : t.semantic.green;
  const text = flat ? 'no change' : `${up ? '↑' : '↓'} ${Math.abs(Math.round(pct))}% vs last mo`;
  return (
    <Surface
      backgroundColor={t.colors.card}
      offset={0}
      radius={999}
      borderWidth={t.border.row}
      style={{ paddingHorizontal: 10, paddingVertical: 3 }}
    >
      <AppText variant="subheading" color={color} style={{ fontSize: 11 }}>
        {text}
      </AppText>
    </Surface>
  );
}

function KpiCard({ t, label, value }: { t: Theme; label: string; value: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Card padded radius={t.radius.card}>
        <AppText variant="label">{label}</AppText>
        <AppText variant="money" style={{ fontSize: 22, marginTop: 4 }}>
          {value}
        </AppText>
      </Card>
    </View>
  );
}

function TxnRow({
  t,
  txn,
  last,
  onPress,
}: {
  t: Theme;
  txn: RecentTransaction;
  last: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: t.spacing.sm,
        borderBottomWidth: last ? 0 : t.border.row,
        borderBottomColor: t.colors.hair,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <View style={{ flexShrink: 1, paddingRight: t.spacing.sm }}>
        <AppText variant="bodyMedium" numberOfLines={1}>
          {txn.description || 'Transaction'}
        </AppText>
        <AppText variant="body" tone="muted" style={{ fontSize: 12, marginTop: 1 }}>
          {formatShortDate(txn.txn_date)}
        </AppText>
      </View>
      <AppText variant="money" style={{ fontSize: 15 }}>
        {formatINR(txn.amount)}
      </AppText>
    </Pressable>
  );
}

function EmptyCard({ t, label }: { t: Theme; label: string }) {
  return (
    <Card background={t.candy.mint} style={{ alignItems: 'center', paddingVertical: t.spacing.xl }}>
      <AppText style={{ fontSize: 34 }}>🧾</AppText>
      <AppText variant="heading" color={t.candyText} style={{ marginTop: t.spacing.sm }}>
        No spending yet in {label}
      </AppText>
      <AppText variant="bodyMedium" color={t.candyText} style={{ marginTop: 4, textAlign: 'center' }}>
        Add a transaction with the ＋ button and it’ll show up here.
      </AppText>
    </Card>
  );
}

function ErrorCard({ t, onRetry, retrying }: { t: Theme; onRetry: () => void; retrying: boolean }) {
  return (
    <Card background={t.candy.coral}>
      <AppText variant="heading" color={t.candyText}>
        Couldn’t load your dashboard
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

/** Static, hair-colored blocks that mirror the loaded layout's rhythm. */
function DashboardSkeleton({ t }: { t: Theme }) {
  const Block = ({ h, r = t.radius.card, flex }: { h: number; r?: number; flex?: number }) => (
    <View style={{ flex, height: h, borderRadius: r, backgroundColor: t.colors.hair }} />
  );
  return (
    <View style={{ gap: t.spacing.lg }}>
      <Block h={116} r={t.radius.cardLg} />
      <View style={{ flexDirection: 'row', gap: t.spacing.md }}>
        <Block h={78} flex={1} />
        <Block h={78} flex={1} />
      </View>
      <Block h={180} r={t.radius.cardLg} />
    </View>
  );
}
