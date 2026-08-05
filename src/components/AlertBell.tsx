import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import type { Alert } from '@/api/alerts';
import { useAcknowledgeAlert, useUnreadAlerts } from '@/hooks/useAlerts';
import { categoryVisual } from '@/lib/categoryVisual';
import { formatShortDate } from '@/lib/format';
import { useTheme, type Theme } from '@/theme';
import { AppText, BottomSheet, Card } from './ui';
import { Surface } from './ui/Surface';

const FULL_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

/** Full month name from a `YYYY-MM` string, e.g. "2026-08" → "August". */
function fullMonthName(month: string): string {
  const m = Number(month.split('-')[1]);
  return FULL_MONTHS[m - 1] ?? month;
}

/**
 * Bell icon with an unread-count badge, mirroring the web app's Navbar bell.
 * Tapping opens a scrollable sheet of budget-threshold alerts — the backend
 * also emits `new_category` alerts (from statement imports), but those are
 * filtered out here; this bell is only for the 75/90/100% budget messages.
 */
export function AlertBell() {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  const { data } = useUnreadAlerts();
  const acknowledge = useAcknowledgeAlert();

  const alerts = useMemo(() => (data ?? []).filter((a) => a.type === 'budget' && a.goal != null), [data]);
  const count = alerts.length;

  return (
    <>
      <Pressable onPress={() => setOpen(true)} hitSlop={6}>
        <Surface
          backgroundColor={t.candy.yellow}
          offset={t.shadowOffset.chip}
          radius={999}
          style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
        >
          <AppText style={{ fontSize: 18 }}>🔔</AppText>
        </Surface>
        {count > 0 && (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: -4,
              right: -4,
              minWidth: 18,
              height: 18,
              borderRadius: 9,
              paddingHorizontal: 4,
              backgroundColor: t.semantic.red,
              borderWidth: 1.5,
              borderColor: t.colors.bg,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AppText variant="label" color="#FFFFFF" style={{ fontSize: 9, letterSpacing: 0 }}>
              {count > 9 ? '9+' : count}
            </AppText>
          </View>
        )}
      </Pressable>

      <BottomSheet visible={open} onClose={() => setOpen(false)} style={{ maxHeight: '75%' }}>
        <AppText variant="title" style={{ fontSize: 18 }}>
          Alerts
        </AppText>

        {count === 0 ? (
          <Card style={{ alignItems: 'center', paddingVertical: t.spacing.xl, marginTop: t.spacing.md }}>
            <AppText style={{ fontSize: 30, lineHeight: 36 }}>🔔</AppText>
            <AppText variant="heading" style={{ marginTop: t.spacing.sm }}>
              You&rsquo;re all caught up
            </AppText>
            <AppText variant="body" tone="muted" style={{ marginTop: 4, textAlign: 'center' }}>
              Budget alerts will show up here.
            </AppText>
          </Card>
        ) : (
          <ScrollView
            style={{ flexShrink: 1, marginTop: t.spacing.md }}
            contentContainerStyle={{ gap: t.spacing.sm, paddingBottom: t.spacing.sm }}
            showsVerticalScrollIndicator={false}
          >
            {alerts.map((a) => (
              <AlertRow key={a.id} t={t} alert={a} onAcknowledge={() => acknowledge.mutate(a.id)} />
            ))}
          </ScrollView>
        )}
      </BottomSheet>
    </>
  );
}

function AlertRow({
  t,
  alert,
  onAcknowledge,
}: {
  t: Theme;
  alert: Alert;
  onAcknowledge: () => void;
}) {
  const goal = alert.goal!;
  const visual = categoryVisual(goal.category.icon_name, goal.category.name);
  // Matches the web app's Navbar wording exactly.
  const message = `You've used ${alert.threshold_percentage}% of your ${goal.category.name} budget for ${fullMonthName(goal.month)}.`;

  return (
    <Pressable onPress={onAcknowledge}>
      <Card radius={t.radius.card}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm }}>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: t.radius.chip,
              backgroundColor: visual.color,
              borderWidth: t.border.row,
              borderColor: t.colors.line,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AppText style={{ fontSize: 16 }}>{visual.emoji}</AppText>
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="bodyMedium" style={{ fontSize: 13 }}>
              {message}
            </AppText>
            {alert.triggered_at ? (
              <AppText variant="body" tone="muted" style={{ fontSize: 11, marginTop: 2 }}>
                {formatShortDate(alert.triggered_at)}
              </AppText>
            ) : null}
          </View>
          <AppText variant="label" tone="link" style={{ fontSize: 10 }}>
            Dismiss
          </AppText>
        </View>
      </Card>
    </Pressable>
  );
}
