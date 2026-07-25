import { useState } from 'react';
import { Pressable, TextInput, TextInputProps, View } from 'react-native';

import { useTheme } from '@/theme';
import { AppText } from './AppText';

type Props = TextInputProps & {
  label?: string;
  error?: string;
  /** Renders a show/hide eye toggle and manages secureTextEntry. */
  password?: boolean;
};

/** Pocket-styled text input: 2px ink border, cream/card fill, label + error. */
export function TextField({ label, error, password, style, ...rest }: Props) {
  const t = useTheme();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);

  return (
    <View style={{ gap: 6 }}>
      {label ? <AppText variant="label">{label}</AppText> : null}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: t.colors.card,
          borderWidth: t.border.card,
          borderColor: error ? t.semantic.red : focused ? t.colors.ink : t.colors.line,
          borderRadius: t.radius.chip,
          paddingHorizontal: t.spacing.md,
        }}
      >
        {/* `rest` is spread first so our handlers below compose with a caller's
            onFocus/onBlur rather than being overwritten by them. */}
        <TextInput
          {...rest}
          style={[
            {
              flex: 1,
              paddingVertical: 13,
              fontFamily: t.font.body,
              fontSize: 15,
              color: t.colors.ink,
            },
            style,
          ]}
          placeholderTextColor={t.colors.faint}
          secureTextEntry={password ? hidden : false}
          autoCapitalize={rest.autoCapitalize ?? 'none'}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
        />
        {password ? (
          <Pressable onPress={() => setHidden((h) => !h)} hitSlop={8} style={{ paddingLeft: 8 }}>
            <AppText variant="bodySemi" tone="muted" style={{ fontSize: 13 }}>
              {hidden ? 'Show' : 'Hide'}
            </AppText>
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <AppText variant="body" color={t.semantic.red} style={{ fontSize: 12 }}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}
