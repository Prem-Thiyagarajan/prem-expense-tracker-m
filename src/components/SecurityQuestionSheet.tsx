import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { AppText, Button, TextField, useToast } from '@/components/ui';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { PressableSurface } from '@/components/ui/Surface';
import { useSetSecurityQuestion } from '@/hooks/useProfile';
import { apiErrorMessage } from '@/lib/apiError';
import { useTheme, type Theme } from '@/theme';

type Props = {
  visible: boolean;
  onClose: () => void;
};

/**
 * Ready-made prompts. Deliberately things with a single, stable, memorable
 * answer — anything you might later spell differently is a locked account.
 */
const PRESETS = [
  'What was the name of your first pet?',
  'What city were you born in?',
  'What was the name of your first school?',
  'What is your mother’s maiden name?',
  'What was your childhood nickname?',
] as const;

const CUSTOM = '__custom__';

/**
 * Sets the account-recovery security question (Profile → Security).
 *
 * This is the write side of the forgot-password flow: whatever is saved here is
 * what `ForgotPasswordSheet` will later ask for. The backend demands the current
 * password too, so a stolen session alone can't plant a recovery answer.
 *
 * There is no endpoint to read back your own question — the only reader is the
 * unauthenticated `POST /auth/recovery/question`, which is rate-limited to
 * 5/hour and shared with real password recovery. Calling it just to prefill this
 * sheet could burn the budget a locked-out user needs, so the sheet always
 * presents as "set or replace" rather than showing the current value.
 */
export function SecurityQuestionSheet({ visible, onClose }: Props) {
  const t = useTheme();
  const toast = useToast();
  const save = useSetSecurityQuestion();

  const [choice, setChoice] = useState<string>(PRESETS[0]);
  const [custom, setCustom] = useState('');
  const [answer, setAnswer] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Clear the form each time the sheet opens — a recovery answer shouldn't
  // linger in memory behind a dismissed sheet.
  useEffect(() => {
    if (visible) {
      setChoice(PRESETS[0]);
      setCustom('');
      setAnswer('');
      setPassword('');
      setError(null);
    }
  }, [visible]);

  const question = choice === CUSTOM ? custom.trim() : choice;

  const onSubmit = async () => {
    if (!question) return setError('Choose or write a question');
    if (!answer.trim()) return setError('Enter your answer');
    if (!password) return setError('Enter your current password to confirm');

    setError(null);
    try {
      await save.mutateAsync({ current_password: password, question, answer });
      toast.show('Security question saved ✓');
      onClose();
    } catch (e) {
      setError(apiErrorMessage(e, 'Could not save your security question'));
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} style={{ maxHeight: '88%' }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ gap: t.spacing.md, paddingBottom: t.spacing.sm }}
      >
        <View>
          <AppText variant="title" style={{ fontSize: 18 }}>
            Security question
          </AppText>
          <AppText variant="bodyMedium" tone="muted" style={{ fontSize: 12, marginTop: 4 }}>
            If you ever forget your password, this is what we’ll ask to let you back in.
            Saving a new one replaces any question already set.
          </AppText>
        </View>

        <View style={{ gap: t.spacing.sm }}>
          <AppText variant="label">Choose a question</AppText>
          {PRESETS.map((preset) => (
            <QuestionOption
              key={preset}
              t={t}
              label={preset}
              selected={choice === preset}
              onPress={() => setChoice(preset)}
            />
          ))}
          <QuestionOption
            t={t}
            label="Write my own"
            selected={choice === CUSTOM}
            onPress={() => setChoice(CUSTOM)}
          />
        </View>

        {choice === CUSTOM && (
          <TextField
            label="Your question"
            placeholder="Something only you know the answer to"
            value={custom}
            onChangeText={setCustom}
          />
        )}

        <View>
          <TextField
            label="Your answer"
            placeholder="Keep it short and memorable"
            value={answer}
            onChangeText={setAnswer}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <AppText variant="body" tone="muted" style={{ fontSize: 11, marginTop: 4 }}>
            Capitals and extra spaces are ignored when you answer later.
          </AppText>
        </View>

        <TextField
          label="Current password"
          placeholder="Confirm it’s really you"
          password
          value={password}
          onChangeText={setPassword}
        />

        {error ? (
          <AppText variant="body" color={t.semantic.red} style={{ fontSize: 12 }}>
            {error}
          </AppText>
        ) : null}

        <Button
          label="Save question"
          variant="primary"
          loading={save.isPending}
          onPress={onSubmit}
          style={{ marginTop: t.spacing.xs }}
        />
      </ScrollView>
    </BottomSheet>
  );
}

/** One selectable prompt — candy fill + hard shadow when chosen. */
function QuestionOption({
  t,
  label,
  selected,
  onPress,
}: {
  t: Theme;
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <PressableSurface
      onPress={onPress}
      backgroundColor={selected ? t.candy.mint : t.colors.card}
      radius={t.radius.chip}
      borderWidth={t.border.row}
      offset={selected ? t.shadowOffset.chip : 0}
      style={{ paddingHorizontal: t.spacing.md, paddingVertical: t.spacing.md }}
    >
      <AppText
        variant={selected ? 'bodySemi' : 'body'}
        color={selected ? t.candyText : t.colors.ink}
        style={{ fontSize: 13 }}
      >
        {label}
      </AppText>
    </PressableSurface>
  );
}
