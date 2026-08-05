import { View } from 'react-native';

import type { IncomingBill } from '@/lib/billRadar';
import { formatINR } from '@/lib/format';
import { MONTHS } from '@/lib/month';
import { useTheme } from '@/theme';
import { AppText, Card } from './ui';

/**
 * "Incoming" recurring bills for the rest of the live month — Netflix,
 * electricity, etc. — predicted client-side from transaction history (see
 * `useBillRadar`). Renders nothing when there's nothing upcoming.
 */
export function BillRadarCard({ bills }: { bills: IncomingBill[] }) {
  const t = useTheme();
  if (bills.length === 0) return null;

  const monthShort = MONTHS[new Date().getMonth()];

  return (
    <Card background={t.candy.mint}>
      <AppText variant="label" color={t.candyText}>
        📡 Bill radar — incoming
      </AppText>
      <View style={{ marginTop: t.spacing.sm, gap: t.spacing.sm }}>
        {bills.map((b) => (
          <View
            key={b.key}
            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: t.spacing.sm }}
          >
            <AppText variant="heading" color={t.candyText} style={{ fontSize: 13, flexShrink: 1 }} numberOfLines={1}>
              {b.merchant}{' '}
              <AppText variant="body" color={t.candyText} style={{ fontSize: 11, opacity: 0.7 }}>
                ~{b.predictedDay} {monthShort}
              </AppText>
            </AppText>
            <AppText variant="money" color={t.candyText} style={{ fontSize: 13 }}>
              {b.amountVaries ? '~' : ''}
              {formatINR(b.predictedAmount)}
            </AppText>
          </View>
        ))}
      </View>
    </Card>
  );
}
