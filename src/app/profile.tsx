import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { ChevronLeftIcon } from '@/components/icons';
import { AppText, Card, Screen } from '@/components/ui';
import { useTheme } from '@/theme';

/**
 * Placeholder for the Profile / Settings screen (Milestone 6). It exists now so
 * the navigation target from the Home avatar is final — M6 fills in the content
 * without touching the shell or root navigator.
 */
export default function ProfileScreen() {
  const t = useTheme();
  const router = useRouter();

  return (
    <Screen tabBarInset={false}>
      <View style={{ gap: t.spacing.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm }}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <ChevronLeftIcon size={24} color={t.colors.ink} />
          </Pressable>
          <AppText variant="title">Profile</AppText>
        </View>

        <Card background={t.candy.lilac}>
          <AppText variant="heading" color={t.candyText}>
            Coming in Milestone 6
          </AppText>
          <AppText variant="bodyMedium" color={t.candyText} style={{ marginTop: 6 }}>
            Profile, settings, change password, security question, month picker, and the dark-mode
            toggle all land here.
          </AppText>
        </Card>
      </View>
    </Screen>
  );
}
