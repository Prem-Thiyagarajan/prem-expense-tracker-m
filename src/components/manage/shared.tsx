import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { ChevronLeftIcon, PlusIcon, TrashIcon } from '@/components/icons';
import { AppText, Button } from '@/components/ui';
import { PressableSurface } from '@/components/ui/Surface';
import { useTheme, type Theme } from '@/theme';

/** Back arrow + title + short subtitle, shared by every manage screen. */
export function ManageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  const t = useTheme();
  const router = useRouter();
  return (
    <View style={{ gap: t.spacing.xs }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm }}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeftIcon size={24} color={t.colors.ink} />
        </Pressable>
        <AppText variant="title">{title}</AppText>
      </View>
      <AppText variant="body" tone="muted" style={{ marginLeft: 32 }}>
        {subtitle}
      </AppText>
    </View>
  );
}

/** The candy "＋ Add" button that opens an entity's create sheet. */
export function AddButton({ label, onPress }: { label: string; onPress: () => void }) {
  const t = useTheme();
  return (
    <Button
      label={label}
      variant="candy"
      candyColor={t.candy.yellow}
      onPress={onPress}
      left={<PlusIcon size={18} color={t.candyText} />}
    />
  );
}

/**
 * One entity in a manage list: tap the body to edit, tap the trash to delete.
 * The leading slot carries an emoji tile or similar glyph.
 */
export function EntityRow({
  leading,
  label,
  subtitle,
  onEdit,
  onDelete,
}: {
  leading: React.ReactNode;
  label: string;
  subtitle?: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const t = useTheme();
  return (
    <PressableSurface
      onPress={onEdit}
      radius={t.radius.chip}
      offset={t.shadowOffset.chip}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: t.spacing.md,
        paddingVertical: t.spacing.md,
        paddingHorizontal: t.spacing.md,
      }}
    >
      {leading}
      <View style={{ flex: 1 }}>
        <AppText variant="bodySemi" numberOfLines={1}>
          {label}
        </AppText>
        {subtitle ? (
          <AppText variant="body" tone="muted" style={{ fontSize: 12, marginTop: 1 }} numberOfLines={1}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      <Pressable onPress={onDelete} hitSlop={10} style={{ padding: 4 }}>
        <TrashIcon size={20} color={t.colors.muted} />
      </Pressable>
    </PressableSurface>
  );
}

/** Circular emoji tile used as the leading glyph on category/account rows. */
export function EmojiTile({ emoji, color }: { emoji: string; color: string }) {
  const t = useTheme();
  return (
    <View
      style={{
        width: 40,
        height: 40,
        borderRadius: 999,
        borderWidth: t.border.row,
        borderColor: t.colors.line,
        backgroundColor: color,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <AppText style={{ fontSize: 18 }}>{emoji}</AppText>
    </View>
  );
}

/** Placeholder rows shown while the list query is loading. */
export function ManageSkeleton({ t }: { t: Theme }) {
  return (
    <View style={{ gap: t.spacing.sm }}>
      {[0, 1, 2, 3].map((i) => (
        <View
          key={i}
          style={{ height: 64, borderRadius: t.radius.chip, backgroundColor: t.colors.hair }}
        />
      ))}
    </View>
  );
}

/** Centered empty / error state with an emoji and a line of copy. */
export function ManageEmpty({ emoji, text }: { emoji: string; text: string }) {
  const t = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: t.spacing.xxl, gap: t.spacing.sm }}>
      <AppText style={{ fontSize: 32, lineHeight: 38 }}>{emoji}</AppText>
      <AppText variant="bodyMedium" tone="muted" style={{ textAlign: 'center' }}>
        {text}
      </AppText>
    </View>
  );
}
