import { View } from 'react-native';

import type { BillRadarItem } from '@/hooks/useBillRadar';
import { formatINR, formatShortDate } from '@/lib/format';
import { useTheme } from '@/theme';
import { AppText, Card } from './ui';

/**
 * "Incoming" bills for the rest of the live month, sourced from Manage →
 * Subscriptions (see `useBillRadar`). Renders nothing when there's nothing
 * due or overdue.
 */
export function BillRadarCard({ bills }: { bills: BillRadarItem[] }) {
  const t = useTheme();
  if (bills.length === 0) return null;

  return (
    <Card background={t.candy.mint}>
      <AppText variant="label" color={t.candyText}>
        📡 Bill radar — incoming
      </AppText>
      <View style={{ marginTop: t.spacing.sm, gap: t.spacing.sm }}>
        {bills.map((b) => (
          <View
            key={b.id}
            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: t.spacing.sm }}
          >
            <AppText variant="heading" color={t.candyText} style={{ fontSize: 13, flexShrink: 1 }} numberOfLines={1}>
              {b.name}{' '}
              <AppText
                variant="body"
                color={b.overdue ? t.semantic.red : t.candyText}
                style={{ fontSize: 11, opacity: b.overdue ? 1 : 0.7 }}
              >
                {b.overdue ? 'overdue since ' : ''}
                {formatShortDate(b.dueDate)}
              </AppText>
            </AppText>
            <AppText variant="money" color={b.overdue ? t.semantic.red : t.candyText} style={{ fontSize: 13 }}>
              {formatINR(b.amount)}
            </AppText>
          </View>
        ))}
      </View>
    </Card>
  );
}
