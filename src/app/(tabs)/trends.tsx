import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, type Href } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';

import {
  ANALYTICS_RANGES,
  isRangePeriod,
  type AnalyticsRange,
  type CompositionPoint,
  type VelocityPoint,
} from '@/api/analytics';
import { useAuth } from '@/auth/AuthProvider';
import {
  CategoryBars,
  ChartCard,
  DayLineChart,
  HabitQuadrant,
  MonthlyBars,
  SpendCalendar,
  WeekdayProfile,
  type DaySeries,
} from '@/components/charts';
import { MonthSwitcher } from '@/components/MonthSwitcher';
import { AppText, Button, Card, Chip, Screen } from '@/components/ui';
import { Surface } from '@/components/ui/Surface';
import { useAnalytics } from '@/hooks/useAnalytics';
import { formatINR } from '@/lib/format';
import { daysInMonth, formatMonthLabel } from '@/lib/month';
import { useMonth } from '@/state/MonthProvider';
import { useTheme, type Theme } from '@/theme';

/** Chip captions for the fixed ranges; the month chip is labelled by useMonth(). */
const RANGE_CHIP: Record<AnalyticsRange, string> = { '3m': '3M', '6m': '6M', '1y': '1Y', all: 'All' };
/** Prose form, for hero copy and empty states. */
const RANGE_PROSE: Record<AnalyticsRange, string> = {
  '3m': 'the last 3 months',
  '6m': 'the last 6 months',
  '1y': 'the last 12 months',
  all: 'all time',
};

/** `month` = drill into the app-wide selected month; otherwise a fixed range. */
type Selection = 'month' | AnalyticsRange;

/** The current month's velocity series are padded to 31 days by the backend. */
const VELOCITY_DAYS = 31;

export default function TrendsScreen() {
  const t = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { month, label } = useMonth();

  const [selection, setSelection] = useState<Selection>('month');
  const [includeTransfers, setIncludeTransfers] = useState(false);

  const period = selection === 'month' ? month : selection;
  const { data, isLoading, isError, refetch, isRefetching, isPlaceholderData } = useAnalytics(
    period,
    includeTransfers,
  );

  // Paging the month switcher while a range is selected is a clear signal the
  // user wants that month — snap back to month mode rather than silently
  // ignoring the control. Only fires for changes made on this screen.
  const lastMonth = useRef(month);
  useEffect(() => {
    if (lastMonth.current !== month) {
      lastMonth.current = month;
      setSelection('month');
    }
  }, [month]);

  const initial = user?.username?.[0]?.toUpperCase() ?? '?';
  const isRange = isRangePeriod(period);
  const windowLabel = selection === 'month' ? label : RANGE_PROSE[selection];

  const distribution = useMemo(
    () => [...(data?.categoryDistribution ?? [])].sort((a, b) => b.total - a.total),
    [data?.categoryDistribution],
  );
  /**
   * The true total for the period. It comes from the heatmap, not from
   * `categoryDistribution`, because the backend builds the distribution with an
   * INNER JOIN onto categories — spending on transactions with no category is
   * missing from it entirely. The heatmap has no such join, so it's the only
   * section that always accounts for every debit, and it's what keeps this
   * figure agreeing with the Home screen's.
   */
  const periodTotal = useMemo(
    () => (data?.transactionHeatmap ?? []).reduce((s, p) => s + p.spend, 0),
    [data?.transactionHeatmap],
  );
  /** The share of that total the backend could attribute to a category. */
  const categorisedTotal = useMemo(
    () => distribution.reduce((s, d) => s + d.total, 0),
    [distribution],
  );
  const uncategorised = Math.max(0, periodTotal - categorisedTotal);

  // habitIdentifier carries no icon_name — borrow it from the distribution rows,
  // which the backend groups by the same category name.
  const iconByCategory = useMemo(
    () => new Map(distribution.map((d) => [d.category, d.icon_name])),
    [distribution],
  );

  const velocitySeries = useMemo(
    () => (data ? buildVelocitySeries(t, data.spendingVelocity) : []),
    [data, t],
  );
  const compositionSeries = useMemo(
    () => (data ? buildCompositionSeries(t, data.spendingComposition, month) : []),
    [data, t, month],
  );

  // "Empty" means the period genuinely had no debits — not merely that none of
  // them carried a category. Keying this off the distribution used to blank the
  // whole screen for a month with real spending but no categories on it.
  const isEmpty = !!data && periodTotal === 0 && categorisedTotal === 0;

  return (
    <Screen>
      <View style={{ gap: t.spacing.lg }}>
        {/* Header: logo tile · month control · avatar → profile */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Surface
            backgroundColor={t.candy.blue}
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
            <AppText style={{ fontSize: 20 }}>📊</AppText>
          </Surface>

          <MonthSwitcher />

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

        {/* Period selector. The first chip drills into the switcher's month;
            the rest are the backend's fixed multi-month windows. */}
        <View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginHorizontal: -t.spacing.lg }}
            contentContainerStyle={{ paddingHorizontal: t.spacing.lg, gap: 7 }}
          >
            <Chip
              label={label}
              selected={selection === 'month'}
              candyColor={t.candy.yellow}
              onPress={() => setSelection('month')}
            />
            {ANALYTICS_RANGES.map((r) => (
              <Chip
                key={r}
                label={RANGE_CHIP[r]}
                selected={selection === r}
                candyColor={t.candy.yellow}
                onPress={() => setSelection(r)}
              />
            ))}
          </ScrollView>

          <View style={{ alignItems: 'flex-end', marginTop: t.spacing.sm }}>
            <Chip
              label={`Transfers: ${includeTransfers ? 'on' : 'off'}`}
              selected={includeTransfers}
              candyColor={t.candy.mint}
              onPress={() => setIncludeTransfers((v) => !v)}
            />
          </View>
        </View>

        {isLoading ? (
          <TrendsSkeleton t={t} />
        ) : isError ? (
          <ErrorCard t={t} onRetry={refetch} retrying={isRefetching} />
        ) : isEmpty ? (
          <EmptyCard t={t} windowLabel={windowLabel} />
        ) : data ? (
          // Dimmed while showing the previously-loaded period, so the numbers
          // are never mistaken for the period named in the header.
          <View style={{ gap: t.spacing.lg, opacity: isPlaceholderData ? 0.45 : 1 }}>
            <Card background={t.candy.lilac}>
              <AppText variant="label" color={t.candyText}>
                Spent {selection === 'month' ? 'in' : 'over'} {windowLabel}
              </AppText>
              <AppText variant="money" color={t.candyText} style={{ fontSize: 40, marginTop: t.spacing.sm }}>
                {formatINR(periodTotal)}
              </AppText>
              <AppText variant="bodyMedium" color={t.candyText} style={{ fontSize: 12, marginTop: 2, opacity: 0.8 }}>
                {distribution.length === 0
                  ? 'not categorised yet'
                  : `across ${distribution.length} ${distribution.length === 1 ? 'category' : 'categories'}`}
              </AppText>
            </Card>

            {/* All-time context — the same regardless of the selected period.
                Both cards always carry a note so the pair stays the same height. */}
            <View style={{ flexDirection: 'row', alignItems: 'stretch', gap: t.spacing.md }}>
              <KpiCard
                t={t}
                label="Avg / month"
                value={formatINR(data.overview.averageSpendPerMonth)}
                note="all time"
              />
              <KpiCard
                t={t}
                label="Biggest month"
                value={
                  data.overview.highestSpendMonth
                    ? formatINR(data.overview.highestSpendMonth.actual)
                    : '—'
                }
                note={
                  data.overview.highestSpendMonth
                    ? formatMonthLabel(data.overview.highestSpendMonth.month)
                    : 'all time'
                }
              />
            </View>

            {distribution.length > 0 ? (
              <ChartCard title="Where it went" meta={formatINR(categorisedTotal)}>
                <CategoryBars t={t} data={distribution} />
                {uncategorised > 0 ? (
                  <AppText variant="body" tone="muted" style={{ fontSize: 11, marginTop: t.spacing.sm }}>
                    {formatINR(uncategorised)} isn’t shown here — those transactions have no
                    category yet.
                  </AppText>
                ) : null}
              </ChartCard>
            ) : (
              <ChartCard title="Where it went" meta="no categories">
                <AppText variant="bodyMedium" style={{ fontSize: 13 }}>
                  None of this period’s {formatINR(periodTotal)} has a category, so there’s no
                  breakdown to draw.
                </AppText>
                <AppText variant="body" tone="muted" style={{ fontSize: 12, marginTop: 6 }}>
                  Imported transactions fall back to a category named “Miscellaneous”. If you
                  don’t have one, they’re saved with no category at all — add your categories in
                  Profile → Manage, then re-import.
                </AppText>
              </ChartCard>
            )}

            {/* Range periods get month-over-month totals; a single month gets its
                day-level small-vs-large split. The backend only fills one. */}
            {isRange
              ? data.monthlyBreakdown.length > 0 && (
                  <ChartCard title="Monthly breakdown" meta={`${data.monthlyBreakdown.length} months`}>
                    <MonthlyBars t={t} data={data.monthlyBreakdown} />
                  </ChartCard>
                )
              : compositionSeries.length > 0 && (
                  <ChartCard title="Spending composition" meta="cumulative ₹">
                    <DayLineChart
                      t={t}
                      series={compositionSeries}
                      days={daysInMonth(month)}
                      emptyHint={`No spending in ${label}`}
                    />
                  </ChartCard>
                )}

            {isRange && velocitySeries.length > 0 && (
              <ChartCard title="Spending velocity" meta="cumulative ₹">
                <DayLineChart t={t} series={velocitySeries} days={VELOCITY_DAYS} />
              </ChartCard>
            )}

            {!isRange && (
              <ChartCard title="Spending calendar">
                <SpendCalendar t={t} data={data.transactionHeatmap} month={month} />
              </ChartCard>
            )}

            {data.habitIdentifier.length > 0 && (
              <ChartCard title="Spending habits">
                <HabitQuadrant t={t} data={data.habitIdentifier} iconByCategory={iconByCategory} />
              </ChartCard>
            )}

            {data.transactionHeatmap.length > 0 && (
              <ChartCard title="Weekly rhythm" meta="totals by weekday">
                <WeekdayProfile t={t} data={data.transactionHeatmap} />
              </ChartCard>
            )}
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

/**
 * This month's cumulative spend against last month's and the window's average.
 * `current` is null past today, which breaks its line cleanly at the live edge.
 */
function buildVelocitySeries(t: Theme, points: VelocityPoint[]): DaySeries[] {
  if (points.length === 0) return [];

  const column = (pick: (p: VelocityPoint) => number | null) => {
    const values = Array<number | null>(VELOCITY_DAYS).fill(null);
    for (const p of points) {
      if (p.day >= 1 && p.day <= VELOCITY_DAYS) values[p.day - 1] = pick(p);
    }
    return values;
  };

  const series: DaySeries[] = [
    { key: 'current', label: 'This month', color: t.candy.blue, values: column((p) => p.current) },
    { key: 'previous', label: 'Last month', color: t.candy.coral, dashed: true, values: column((p) => p.previous) },
    { key: 'average', label: 'Avg month', color: t.candy.lilac, dashed: true, values: column((p) => p.average) },
  ];

  // Drop series with nothing to draw (e.g. no history yet) so the legend
  // doesn't advertise a line that isn't there.
  return series.filter((s) => s.values.some((v) => v != null && v > 0));
}

/** Cumulative spend split at ₹1,000 — impulse buys vs the big-ticket items. */
function buildCompositionSeries(t: Theme, points: CompositionPoint[], month: string): DaySeries[] {
  if (points.length === 0) return [];
  const days = daysInMonth(month);

  const column = (pick: (p: CompositionPoint) => number | null) => {
    const values = Array<number | null>(days).fill(null);
    for (const p of points) {
      if (p.day >= 1 && p.day <= days) values[p.day - 1] = pick(p);
    }
    return values;
  };

  return [
    {
      key: 'large',
      label: 'Large ≥ ₹1,000',
      color: t.candy.coral,
      dashed: true,
      values: column((p) => p.cumulative_large),
    },
    {
      key: 'small',
      label: 'Small < ₹1,000',
      color: t.candy.blue,
      values: column((p) => p.cumulative_small),
    },
  ];
}

/**
 * Half-width stat tile. `note` is required rather than optional so a pair of
 * these always renders the same three lines — an absent note on one side used to
 * leave the two cards visibly mismatched in height.
 */
function KpiCard({ t, label, value, note }: { t: Theme; label: string; value: string; note: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Card padded radius={t.radius.card}>
        <AppText variant="label" numberOfLines={1}>
          {label}
        </AppText>
        <AppText variant="money" numberOfLines={1} style={{ fontSize: 20, marginTop: 4 }}>
          {value}
        </AppText>
        <AppText variant="body" tone="muted" numberOfLines={1} style={{ fontSize: 11, marginTop: 1 }}>
          {note}
        </AppText>
      </Card>
    </View>
  );
}

function EmptyCard({ t, windowLabel }: { t: Theme; windowLabel: string }) {
  return (
    <Card background={t.candy.mint} style={{ alignItems: 'center', paddingVertical: t.spacing.xl }}>
      <AppText style={{ fontSize: 34 }}>📊</AppText>
      <AppText variant="heading" color={t.candyText} style={{ marginTop: t.spacing.sm, textAlign: 'center' }}>
        Nothing to chart for {windowLabel}
      </AppText>
      <AppText variant="bodyMedium" color={t.candyText} style={{ marginTop: 4, textAlign: 'center' }}>
        Add some spending — or pick a wider period — and the trends will fill in.
      </AppText>
    </Card>
  );
}

function ErrorCard({ t, onRetry, retrying }: { t: Theme; onRetry: () => void; retrying: boolean }) {
  return (
    <Card background={t.candy.coral}>
      <AppText variant="heading" color={t.candyText}>
        Couldn’t load your trends
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
function TrendsSkeleton({ t }: { t: Theme }) {
  const Block = ({ h, r = t.radius.card, flex }: { h: number; r?: number; flex?: number }) => (
    <View style={{ flex, height: h, borderRadius: r, backgroundColor: t.colors.hair }} />
  );
  return (
    <View style={{ gap: t.spacing.lg }}>
      <Block h={128} r={t.radius.cardLg} />
      <View style={{ flexDirection: 'row', gap: t.spacing.md }}>
        <Block h={82} flex={1} />
        <Block h={82} flex={1} />
      </View>
      <Block h={190} r={t.radius.cardLg} />
      <Block h={210} r={t.radius.cardLg} />
    </View>
  );
}
