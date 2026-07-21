import { View } from 'react-native';

import { useTheme } from '@/theme';
import { AppText } from './ui/AppText';

/** The 5 password rules — mirror the backend's UserCreate.password_complexity. */
export const PASSWORD_RULES: { key: string; label: string; test: (v: string) => boolean }[] = [
  { key: 'len', label: '8+ chars', test: (v) => v.length >= 8 },
  { key: 'upper', label: 'A–Z', test: (v) => /[A-Z]/.test(v) },
  { key: 'lower', label: 'a–z', test: (v) => /[a-z]/.test(v) },
  { key: 'digit', label: '0–9', test: (v) => /[0-9]/.test(v) },
  { key: 'special', label: 'special', test: (v) => /[\W_]/.test(v) },
];

export function isPasswordValid(v: string): boolean {
  return PASSWORD_RULES.every((r) => r.test(v));
}

/** Live checklist: each rule is a pill turning mint + ✓ once satisfied. */
export function PasswordChecklist({ value }: { value: string }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {PASSWORD_RULES.map((rule) => {
        const ok = rule.test(value);
        return (
          <View
            key={rule.key}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: t.radius.pill,
              borderWidth: t.border.row,
              borderColor: ok ? t.colors.ink : t.colors.line,
              backgroundColor: ok ? t.candy.mint : t.colors.card,
            }}
          >
            <AppText
              variant="subheading"
              color={ok ? t.candyText : t.colors.muted}
              style={{ fontSize: 11 }}
            >
              {ok ? '✓ ' : ''}
              {rule.label}
            </AppText>
          </View>
        );
      })}
    </View>
  );
}
