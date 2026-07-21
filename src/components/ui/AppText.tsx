import { Text, TextProps, TextStyle } from 'react-native';

import { useTheme } from '@/theme';

export type TextVariant =
  | 'hero' // Bricolage 800 — big claims
  | 'title' // Bricolage 700 — screen/section titles
  | 'heading' // Bricolage 700 — card headings, merchant names
  | 'subheading' // Bricolage 600
  | 'body' // Archivo 400
  | 'bodyMedium' // Archivo 500
  | 'bodySemi' // Archivo 600
  | 'label' // Archivo 700 uppercase — tiny labels
  | 'money' // Archivo Black — amounts & numerals
  | 'mono' // JetBrains Mono — raw UPI / technical
  | 'link'; // Archivo 600 in link color

type Tone = 'ink' | 'muted' | 'faint' | 'link' | 'onCandy';

type Props = TextProps & {
  variant?: TextVariant;
  tone?: Tone;
  color?: string;
};

export function AppText({ variant = 'body', tone, color, style, ...rest }: Props) {
  const t = useTheme();

  const variants: Record<TextVariant, TextStyle> = {
    hero: { fontFamily: t.font.headingBlack, fontSize: 32, lineHeight: 36, color: t.colors.ink },
    title: { fontFamily: t.font.heading, fontSize: 22, lineHeight: 27, color: t.colors.ink },
    heading: { fontFamily: t.font.heading, fontSize: 16, lineHeight: 20, color: t.colors.ink },
    subheading: { fontFamily: t.font.headingSemi, fontSize: 14, lineHeight: 18, color: t.colors.ink },
    body: { fontFamily: t.font.body, fontSize: 14, lineHeight: 20, color: t.colors.ink },
    bodyMedium: { fontFamily: t.font.bodyMedium, fontSize: 14, lineHeight: 20, color: t.colors.ink },
    bodySemi: { fontFamily: t.font.bodySemi, fontSize: 14, lineHeight: 20, color: t.colors.ink },
    label: {
      fontFamily: t.font.bodyBold,
      fontSize: 10,
      lineHeight: 13,
      letterSpacing: 1.3,
      textTransform: 'uppercase',
      color: t.colors.muted,
    },
    money: { fontFamily: t.font.money, fontSize: 22, letterSpacing: -0.5, color: t.colors.ink },
    mono: { fontFamily: t.font.mono, fontSize: 12, lineHeight: 17, color: t.colors.muted },
    link: { fontFamily: t.font.bodySemi, fontSize: 14, lineHeight: 20, color: t.colors.link },
  };

  const toneColor: Record<Tone, string> = {
    ink: t.colors.ink,
    muted: t.colors.muted,
    faint: t.colors.faint,
    link: t.colors.link,
    onCandy: t.candyText,
  };

  const resolvedColor = color ?? (tone ? toneColor[tone] : undefined);

  return (
    <Text
      style={[variants[variant], resolvedColor ? { color: resolvedColor } : null, style]}
      {...rest}
    />
  );
}
