import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { ChangePasswordSheet } from '@/components/ChangePasswordSheet';
import { DeleteAccountSheet } from '@/components/DeleteAccountSheet';
import { ChevronLeftIcon, ChevronRowIcon } from '@/components/icons';
import { SecurityQuestionSheet } from '@/components/SecurityQuestionSheet';
import { UploadStatementsSheet } from '@/components/UploadStatementsSheet';
import { AppText, Card, Screen, useToast } from '@/components/ui';
import { PressableSurface, Surface } from '@/components/ui/Surface';
import { useTheme, useThemeControls, type Theme, type ThemePreference } from '@/theme';

/**
 * Profile / Settings hub (Milestone 6). Identity, appearance (light/dark/system),
 * drill-in rows for managing categories / accounts / tags, change password, and
 * the account actions (sign out, delete). Every mutation targets an endpoint
 * that already exists on the backend — this screen is pure frontend.
 */
export default function ProfileScreen() {
  const t = useTheme();
  const router = useRouter();
  const { user, signOut } = useAuth();

  const [pwOpen, setPwOpen] = useState(false);
  const [questionOpen, setQuestionOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const toast = useToast();

  const initial = user?.username?.[0]?.toUpperCase() ?? '?';

  return (
    <Screen tabBarInset={false}>
      <View style={{ gap: t.spacing.xl }}>
        {/* Header: back · title · import statements */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm }}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <ChevronLeftIcon size={24} color={t.colors.ink} />
          </Pressable>
          <AppText variant="title" style={{ flex: 1 }}>
            Profile
          </AppText>
          <Pressable onPress={() => setUploadOpen(true)} hitSlop={8}>
            <Surface
              backgroundColor={t.candy.yellow}
              offset={t.shadowOffset.chip}
              radius={t.radius.chip}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                paddingHorizontal: t.spacing.md,
                paddingVertical: 7,
              }}
            >
              <AppText style={{ fontSize: 13 }}>📄</AppText>
              <AppText variant="subheading" color={t.candyText} style={{ fontSize: 12 }}>
                Import
              </AppText>
            </Surface>
          </Pressable>
        </View>

        {/* Identity */}
        <Card background={t.candy.lilac}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.md }}>
            <Surface
              backgroundColor={t.candy.pink}
              offset={t.shadowOffset.chip}
              radius={999}
              style={{ width: 56, height: 56, alignItems: 'center', justifyContent: 'center' }}
            >
              <AppText variant="title" color={t.candyText}>
                {initial}
              </AppText>
            </Surface>
            <View style={{ flexShrink: 1 }}>
              <AppText variant="heading" color={t.candyText} numberOfLines={1}>
                {user?.username ?? 'You'}
              </AppText>
              <AppText variant="bodyMedium" color={t.candyText} numberOfLines={1} style={{ marginTop: 2 }}>
                {user?.email ?? ''}
              </AppText>
            </View>
          </View>
        </Card>

        {/* Appearance */}
        <Section t={t} title="Appearance">
          <AppearanceControl t={t} />
        </Section>

        {/* Manage */}
        <Section t={t} title="Manage">
          <Card padded={false}>
            <DrillRow
              t={t}
              emoji="🏷️"
              label="Categories"
              onPress={() => router.push('/manage/categories' as Href)}
            />
            <DrillRow
              t={t}
              emoji="🏦"
              label="Accounts"
              onPress={() => router.push('/manage/accounts' as Href)}
            />
            <DrillRow
              t={t}
              emoji="🔖"
              label="Tags"
              onPress={() => router.push('/manage/tags' as Href)}
            />
            <DrillRow
              t={t}
              emoji="📡"
              label="Subscriptions"
              last
              onPress={() => router.push('/manage/subscriptions' as Href)}
            />
          </Card>
        </Section>

        {/* Security */}
        <Section t={t} title="Security">
          <Card padded={false}>
            <DrillRow t={t} emoji="🔒" label="Change password" onPress={() => setPwOpen(true)} />
            <DrillRow
              t={t}
              emoji="🛟"
              label="Security question"
              last
              trailing={
                <SecurityQuestionBadge t={t} isSet={user?.has_security_question ?? false} />
              }
              onPress={() => setQuestionOpen(true)}
            />
          </Card>
        </Section>

        {/* Account */}
        <Section t={t} title="Account">
          <Card padded={false}>
            <ActionRow t={t} label="Sign out" onPress={signOut} />
            <ActionRow t={t} label="Delete account" danger last onPress={() => setDeleteOpen(true)} />
          </Card>
        </Section>
      </View>

      <UploadStatementsSheet
        visible={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploaded={(message) => toast.show(message)}
      />
      <ChangePasswordSheet visible={pwOpen} onClose={() => setPwOpen(false)} />
      <SecurityQuestionSheet visible={questionOpen} onClose={() => setQuestionOpen(false)} />
      <DeleteAccountSheet visible={deleteOpen} onClose={() => setDeleteOpen(false)} />
    </Screen>
  );
}

function Section({ t, title, children }: { t: Theme; title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: t.spacing.sm }}>
      <AppText variant="label" style={{ marginLeft: t.spacing.xs }}>
        {title}
      </AppText>
      {children}
    </View>
  );
}

/** Light / Dark / System segmented control wired to the theme preference. */
function AppearanceControl({ t }: { t: Theme }) {
  const { preference, setPreference } = useThemeControls();
  const options: { key: ThemePreference; label: string }[] = [
    { key: 'light', label: 'Light' },
    { key: 'dark', label: 'Dark' },
    { key: 'system', label: 'System' },
  ];
  return (
    <View style={{ flexDirection: 'row', gap: t.spacing.sm }}>
      {options.map((opt) => {
        const selected = preference === opt.key;
        return (
          <View key={opt.key} style={{ flex: 1 }}>
            <PressableSurface
              onPress={() => setPreference(opt.key)}
              backgroundColor={selected ? t.candy.blue : t.colors.card}
              radius={t.radius.chip}
              offset={selected ? t.shadowOffset.chip : 0}
              style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 12 }}
            >
              <AppText variant="subheading" color={selected ? t.candyText : t.colors.ink}>
                {opt.label}
              </AppText>
            </PressableSurface>
          </View>
        );
      })}
    </View>
  );
}

/** A tappable row that drills into a sub-screen or opens a sheet. */
function DrillRow({
  t,
  emoji,
  label,
  last,
  trailing,
  onPress,
}: {
  t: Theme;
  emoji: string;
  label: string;
  last?: boolean;
  /** Optional status pill rendered between the label and the chevron. */
  trailing?: React.ReactNode;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: t.spacing.md,
        paddingHorizontal: t.spacing.lg,
        paddingVertical: t.spacing.md,
        borderBottomWidth: last ? 0 : t.border.row,
        borderBottomColor: t.colors.hair,
      }}
    >
      <AppText style={{ fontSize: 18 }}>{emoji}</AppText>
      <AppText variant="bodySemi" style={{ flex: 1 }}>
        {label}
      </AppText>
      {trailing}
      <ChevronRowIcon size={18} color={t.colors.faint} />
    </Pressable>
  );
}

/** "Set ✓" / "Not set" pill — the only way to know your recovery answer is in place. */
function SecurityQuestionBadge({ t, isSet }: { t: Theme; isSet: boolean }) {
  return (
    <View
      style={{
        borderRadius: t.radius.pill,
        borderWidth: t.border.row,
        borderColor: t.colors.line,
        backgroundColor: isSet ? t.candy.mint : t.colors.hair,
        paddingHorizontal: t.spacing.sm,
        paddingVertical: 3,
      }}
    >
      <AppText
        variant="label"
        color={isSet ? t.candyText : t.colors.muted}
        style={{ fontSize: 9, letterSpacing: 0 }}
      >
        {isSet ? 'Set ✓' : 'Not set'}
      </AppText>
    </View>
  );
}

/** A plain text-action row (sign out / delete). */
function ActionRow({
  t,
  label,
  danger,
  last,
  onPress,
}: {
  t: Theme;
  label: string;
  danger?: boolean;
  last?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: t.spacing.lg,
        paddingVertical: t.spacing.md,
        borderBottomWidth: last ? 0 : t.border.row,
        borderBottomColor: t.colors.hair,
      }}
    >
      <AppText variant="bodySemi" color={danger ? t.semantic.red : t.colors.ink}>
        {label}
      </AppText>
    </Pressable>
  );
}
