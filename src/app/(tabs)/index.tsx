import { View } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { ChevronLeftIcon, ChevronRightIcon } from '@/components/icons';
import { AppText, Button, Card, Chip, Screen, useToast } from '@/components/ui';
import { Surface } from '@/components/ui/Surface';
import { useTheme, useThemeControls } from '@/theme';

export default function HomeScreen() {
  const t = useTheme();
  const toast = useToast();
  const { toggle } = useThemeControls();
  const { user, signOut } = useAuth();
  const isDark = t.mode === 'dark';
  const initial = user?.username?.[0]?.toUpperCase() ?? '?';

  return (
    <Screen>
      {/* Vertical rhythm via a single gap container — no per-card margins (which
          would inflate the hard-shadow layer). */}
      <View style={{ gap: t.spacing.lg }}>
        {/* Header: logo tile · month control · avatar */}
        <View
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <Surface
            backgroundColor={t.candy.yellow}
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
            <AppText style={{ fontSize: 20 }}>💸</AppText>
          </Surface>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm }}>
            <ChevronLeftIcon size={20} color={t.colors.ink} />
            <AppText variant="heading">Jul '26</AppText>
            <ChevronRightIcon size={20} color={t.colors.ink} />
          </View>

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
        </View>

        {/* Guilt-free hero */}
        <Card background={t.candy.mint}>
          <View
            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <AppText variant="label" color={t.candyText}>
              Guilt-free today
            </AppText>
            <Surface
              backgroundColor={t.colors.card}
              offset={0}
              radius={999}
              borderWidth={t.border.row}
              style={{ paddingHorizontal: 10, paddingVertical: 3 }}
            >
              <AppText variant="subheading" style={{ fontSize: 11 }}>
                on pace ✓
              </AppText>
            </Surface>
          </View>
          <AppText variant="money" color={t.candyText} style={{ fontSize: 46, marginTop: t.spacing.sm }}>
            ₹412
          </AppText>
        </Card>

        {/* KPI row */}
        <View style={{ flexDirection: 'row', gap: t.spacing.md }}>
          <View style={{ flex: 1 }}>
            <Card padded radius={t.radius.card}>
              <AppText variant="label">Spent</AppText>
              <AppText variant="money" style={{ fontSize: 22, marginTop: 4 }}>
                ₹8,240
              </AppText>
            </Card>
          </View>
          <View style={{ flex: 1 }}>
            <Card padded radius={t.radius.card}>
              <AppText variant="label">Daily avg</AppText>
              <AppText variant="money" style={{ fontSize: 22, marginTop: 4 }}>
                ₹392
              </AppText>
            </Card>
          </View>
        </View>

        {/* Roast of the day */}
        <Card background={t.candy.yellow}>
          <AppText variant="label" color={t.candyText}>
            Roast of the day
          </AppText>
          <AppText variant="bodyMedium" color={t.candyText} style={{ marginTop: 6 }}>
            Third Zomato order this week — the kitchen misses you. 👀
          </AppText>
        </Card>

        {/* Design-system status */}
        <View style={{ flexDirection: 'row', gap: t.spacing.sm, flexWrap: 'wrap' }}>
          <Chip label="Milestone 0" selected candyColor={t.candy.mint} />
          <Chip label="Design system ✓" />
          <Chip
            label={isDark ? 'Theme: Dark' : 'Theme: Light'}
            onPress={toggle}
            selected
            candyColor={t.candy.lilac}
            left={<AppText style={{ fontSize: 13 }}>{isDark ? '🌙' : '☀️'}</AppText>}
          />
        </View>

        <Button label="Show a toast" variant="primary" onPress={() => toast.show('Saved ✓  −₹412')} />
        <Button
          label={user ? `Sign out (${user.username})` : 'Sign out'}
          variant="danger"
          onPress={signOut}
        />
      </View>
    </Screen>
  );
}
