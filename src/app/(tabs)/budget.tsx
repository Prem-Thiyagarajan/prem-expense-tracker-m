import { useState } from 'react';
import { useRouter, type Href } from 'expo-router';
import { Pressable, View } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import type { CategoryBudget } from '@/api/budget';
import { BudgetCategoryGridSheet } from '@/components/BudgetCategoryGridSheet';
import { BudgetEditSheet } from '@/components/BudgetEditSheet';
import { CategoryBadge } from '@/components/CategoryBadge';
import { BudgetDepletionChart, BudgetPaceChart, CategoryDonut } from '@/components/charts';
import { MonthSwitcher } from '@/components/MonthSwitcher';
import { Pager } from '@/components/Pager';
import { AppText, Button, Card, Screen, useToast } from '@/components/ui';
import { Surface } from '@/components/ui/Surface';
import { useBudget } from '@/hooks/useBudget';
import { useCategories } from '@/hooks/useCategories';
import { formatINR } from '@/lib/format';
import { currentMonth, monthProgress } from '@/lib/month';
import { useMonth } from '@/state/MonthProvider';
import { useTheme, type Theme } from '@/theme';

export default function BudgetScreen() {
  const t = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToast();
  const { month, label } = useMonth();
  const { data, isLoading, isError, refetch, isRefetching, isPlaceholderData } = useBudget(month);
  const { data: categories } = useCategories();
  const [editing, setEditing] = useState(false);
  const [viewingAll, setViewingAll] = useState(false);

  const initial = user?.username?.[0]?.toUpperCase() ?? '?';
  const budgeted = (data?.plan ?? []).filter((b) => b.budget > 0);
  const hasPlan = data?.plan != null && budgeted.length > 0;

  const totalBudget = budgeted.reduce((s, b) => s + b.budget, 0);
  const totalSpent = budgeted.reduce((s, b) => s + b.spent, 0);
  const { elapsed, total } = monthProgress(month);
  const daysLeftInMonth = total - elapsed;
  const usedPct = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  const idealPct = total > 0 ? (elapsed / total) * 100 : 0;

  // The projection extrapolates from days elapsed, so it needs a month that's
  // underway and not yet finished.
  const showProjection = budgeted.length > 0 && elapsed > 0 && daysLeftInMonth > 0;

  return (
    <Screen>
      <View style={{ gap: t.spacing.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Surface
            backgroundColor={t.candy.lilac}
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
            <AppText style={{ fontSize: 20 }}>🎯</AppText>
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

        {isLoading ? (
          <BudgetSkeleton t={t} />
        ) : isError ? (
          <ErrorCard t={t} onRetry={refetch} retrying={isRefetching} />
        ) : !hasPlan ? (
          <EmptyState
            t={t}
            label={label}
            suggestions={data?.historicalData?.suggestedBudgets ?? []}
            onSetUp={() => setEditing(true)}
          />
        ) : (
          // Dimmed while the previous month's plan is still on screen, so a
          // stale figure is never shown as if it belonged to the header's month.
          <View style={{ gap: t.spacing.lg, opacity: isPlaceholderData ? 0.45 : 1 }}>
            <HeroPaceCard
              t={t}
              spent={totalSpent}
              budget={totalBudget}
              usedPct={usedPct}
              idealPct={idealPct}
              daysLeftInMonth={daysLeftInMonth}
              isPastMonth={month < currentMonth()}
            />

            <View>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  marginBottom: t.spacing.sm,
                }}
              >
                <AppText variant="label">By category</AppText>
                <Pressable onPress={() => setViewingAll(true)} hitSlop={8}>
                  <AppText variant="link" style={{ fontSize: 12 }}>
                    View all ({budgeted.length}) →
                  </AppText>
                </Pressable>
              </View>
              <Pager
                items={budgeted.map((b) => (
                  <CategoryBudgetRow key={b.categoryId} t={t} item={b} />
                ))}
              />
            </View>

            {data?.pacingData && data.pacingData.length > 0 && totalBudget > 0 && (
              <Card>
                <BudgetPaceChart
                  t={t}
                  pacingData={data.pacingData}
                  totalBudget={totalBudget}
                  daysInMonthCount={total}
                  elapsedDays={elapsed}
                />
              </Card>
            )}

            {budgeted.length > 0 && (
              <Card>
                <AppText variant="label">Budget composition</AppText>
                <View style={{ marginTop: t.spacing.md }}>
                  <CategoryDonut
                    t={t}
                    data={budgeted.map((b) => ({ category: b.categoryName, amount: b.budget }))}
                    total={totalBudget}
                    centerLabel={label}
                  />
                </View>
              </Card>
            )}

            {showProjection && (
              <Card>
                <BudgetDepletionChart t={t} items={budgeted} elapsedDays={elapsed} totalDays={total} />
              </Card>
            )}

            <Button label="Edit budgets" variant="neutral" onPress={() => setEditing(true)} />
          </View>
        )}
      </View>

      <BudgetEditSheet
        visible={editing}
        onClose={() => setEditing(false)}
        month={month}
        monthLabel={label}
        categories={categories ?? []}
        currentPlan={data?.plan ?? null}
        suggestions={data?.historicalData?.suggestedBudgets ?? null}
        onSaved={() => toast.show(`Budget saved for ${label}`)}
      />

      <BudgetCategoryGridSheet
        visible={viewingAll}
        onClose={() => setViewingAll(false)}
        monthLabel={label}
        items={budgeted}
      />
    </Screen>
  );
}

/** Track + fill, with an optional vertical marker line (e.g. "ideal pace"). */
function ProgressBar({
  t,
  pct,
  color,
  markerPct,
  height = 14,
}: {
  t: Theme;
  pct: number;
  color: string;
  markerPct?: number;
  height?: number;
}) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <View style={{ height, position: 'relative' }}>
      <View
        style={{
          height: '100%',
          backgroundColor: t.colors.hair,
          borderRadius: t.radius.pill,
          borderWidth: t.border.row,
          borderColor: t.colors.line,
          overflow: 'hidden',
        }}
      >
        <View style={{ width: `${clamped}%`, height: '100%', backgroundColor: color }} />
      </View>
      {markerPct != null ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: `${Math.max(0, Math.min(100, markerPct))}%`,
            top: -2,
            bottom: -2,
            width: 2,
            backgroundColor: t.colors.ink,
            opacity: 0.55,
          }}
        />
      ) : null}
    </View>
  );
}

function HeroPaceCard({
  t,
  spent,
  budget,
  usedPct,
  idealPct,
  daysLeftInMonth,
  isPastMonth,
}: {
  t: Theme;
  spent: number;
  budget: number;
  usedPct: number;
  idealPct: number;
  daysLeftInMonth: number;
  isPastMonth: boolean;
}) {
  const over = usedPct > 100;
  return (
    <Card background={t.candy.yellow}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <AppText variant="label" color={t.candyText}>
          Spent / Budget
        </AppText>
        <Surface
          backgroundColor={t.colors.card}
          offset={0}
          radius={999}
          borderWidth={t.border.row}
          style={{ paddingHorizontal: 10, paddingVertical: 3 }}
        >
          <AppText variant="subheading" style={{ fontSize: 11 }}>
            {isPastMonth ? 'Month ended' : `${Math.max(daysLeftInMonth, 0)} days left`}
          </AppText>
        </Surface>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: t.spacing.sm }}>
        <AppText variant="money" color={t.candyText} style={{ fontSize: 32 }}>
          {formatINR(spent)}
        </AppText>
        <AppText variant="bodyMedium" color={t.candyText} style={{ fontSize: 15, marginLeft: 6, opacity: 0.7 }}>
          / {formatINR(budget)}
        </AppText>
      </View>

      <View style={{ marginTop: t.spacing.md }}>
        <ProgressBar
          t={t}
          pct={usedPct}
          color={over ? t.semantic.red : t.colors.ink}
          markerPct={idealPct}
        />
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: t.spacing.xs }}>
        <AppText variant="body" color={t.candyText} style={{ fontSize: 11, opacity: 0.75 }}>
          {Math.round(usedPct)}% used
        </AppText>
        <AppText variant="body" color={t.candyText} style={{ fontSize: 11, opacity: 0.75 }}>
          ideal pace {Math.round(idealPct)}%
        </AppText>
      </View>
    </Card>
  );
}

function CategoryBudgetRow({ t, item }: { t: Theme; item: CategoryBudget }) {
  const over = item.progress > 100;
  const color = over ? t.semantic.red : item.progress >= 90 ? t.semantic.warn : t.semantic.green;
  const note = over
    ? `Over by ${formatINR(item.spent - item.budget)}`
    : `${formatINR(item.remaining)} left · ${Math.round(item.progress)}% used`;

  return (
    <Card radius={t.radius.card}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: t.spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm, flexShrink: 1 }}>
          <CategoryBadge iconName={item.icon_name} name={item.categoryName} size={32} />
          <AppText variant="heading" style={{ fontSize: 13 }} numberOfLines={1}>
            {item.categoryName}
          </AppText>
        </View>
        <AppText variant="money" style={{ fontSize: 13 }}>
          {formatINR(item.spent)} <AppText variant="label">/ {formatINR(item.budget)}</AppText>
        </AppText>
      </View>
      <View style={{ marginTop: t.spacing.sm }}>
        <ProgressBar t={t} pct={item.progress} color={color} height={10} />
      </View>
      <AppText variant="label" style={{ marginTop: 5, color, textTransform: 'none', letterSpacing: 0 }}>
        {note}
      </AppText>
    </Card>
  );
}

function EmptyState({
  t,
  label,
  suggestions,
  onSetUp,
}: {
  t: Theme;
  label: string;
  suggestions: { categoryName: string; suggestedAmount: number }[];
  onSetUp: () => void;
}) {
  const top = suggestions.filter((s) => s.suggestedAmount > 0).slice(0, 3);
  return (
    <Card background={t.candy.lilac}>
      <View style={{ alignItems: 'center', gap: t.spacing.sm }}>
        <AppText style={{ fontSize: 34 }}>🎯</AppText>
        <AppText variant="heading" color={t.candyText}>
          No budget set for {label}
        </AppText>
        <AppText variant="bodyMedium" color={t.candyText} style={{ textAlign: 'center', opacity: 0.85 }}>
          Set a spending limit per category and we&rsquo;ll track your pace through the month.
        </AppText>
      </View>

      {top.length > 0 && (
        <View style={{ marginTop: t.spacing.md, gap: 4 }}>
          {top.map((s) => (
            <AppText key={s.categoryName} variant="body" color={t.candyText} style={{ fontSize: 12, opacity: 0.85 }}>
              Suggested · {s.categoryName}: {formatINR(s.suggestedAmount)}
            </AppText>
          ))}
        </View>
      )}

      <View style={{ marginTop: t.spacing.lg }}>
        <Button label="Set up budget" variant="neutral" onPress={onSetUp} />
      </View>
    </Card>
  );
}

function ErrorCard({ t, onRetry, retrying }: { t: Theme; onRetry: () => void; retrying: boolean }) {
  return (
    <Card background={t.candy.coral}>
      <AppText variant="heading" color={t.candyText}>
        Couldn’t load your budget
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

function BudgetSkeleton({ t }: { t: Theme }) {
  const Block = ({ h, r = t.radius.card, flex }: { h: number; r?: number; flex?: number }) => (
    <View style={{ flex, height: h, borderRadius: r, backgroundColor: t.colors.hair }} />
  );
  return (
    <View style={{ gap: t.spacing.lg }}>
      <Block h={148} r={t.radius.cardLg} />
      <View style={{ gap: t.spacing.sm }}>
        <Block h={70} />
        <Block h={70} />
        <Block h={70} />
      </View>
      <Block h={160} r={t.radius.cardLg} />
    </View>
  );
}
