import { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { getRecoveryQuestion, resetPasswordWithAnswer } from '@/api/auth';
import { isPasswordValid, PasswordChecklist } from '@/components/PasswordChecklist';
import { AppText, Button, TextField } from '@/components/ui';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { useTheme } from '@/theme';

/** Surfaces the backend's `detail` string (already user-friendly) or a fallback. */
function apiErrorMessage(e: unknown, fallback: string): string {
  const detail = (e as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail[0]?.msg) return String(detail[0].msg);
  return fallback;
}

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Pre-fills step 1 with whatever was already typed on the login form. */
  initialIdentifier?: string;
  /** Called with the identifier after a successful reset (parent prefills + toasts). */
  onResetSuccess: (identifier: string) => void;
};

/**
 * Forgot Password (flow F7) — a 2-step bottom sheet over Login.
 *   Step 1: identifier → POST /auth/recovery/question
 *   Step 2: security question + answer + new password → POST /auth/recovery/reset
 * Recovery only works for accounts that have set a security question (that UI
 * lives in Settings, Milestone 6); otherwise step 1 returns a 404 message.
 */
export function ForgotPasswordSheet({ visible, onClose, initialIdentifier, onResetSuccess }: Props) {
  const t = useTheme();

  const [step, setStep] = useState<1 | 2>(1);
  const [identifier, setIdentifier] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset to a clean step 1 each time the sheet opens.
  useEffect(() => {
    if (visible) {
      setStep(1);
      setIdentifier(initialIdentifier?.trim() ?? '');
      setQuestion('');
      setAnswer('');
      setPassword('');
      setLoading(false);
      setError(null);
    }
  }, [visible, initialIdentifier]);

  const onContinue = async () => {
    const id = identifier.trim();
    if (!id) {
      setError('Enter your email or username');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const q = await getRecoveryQuestion(id);
      setQuestion(q);
      setStep(2);
    } catch (e) {
      setError(apiErrorMessage(e, 'Could not start password reset'));
    } finally {
      setLoading(false);
    }
  };

  const onReset = async () => {
    if (!answer.trim()) {
      setError('Enter your answer');
      return;
    }
    if (!isPasswordValid(password)) {
      setError('Password does not meet all rules');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await resetPasswordWithAnswer({
        identifier: identifier.trim(),
        answer: answer.trim(),
        new_password: password,
      });
      onResetSuccess(identifier.trim());
      onClose();
    } catch (e) {
      setError(apiErrorMessage(e, 'Could not reset password'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ gap: t.spacing.md, paddingBottom: t.spacing.sm }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <AppText variant="title" style={{ fontSize: 18 }}>
            Reset your password
          </AppText>
          <Pressable onPress={onClose} hitSlop={8} style={{ padding: 4 }}>
            <AppText variant="bodySemi" tone="muted">
              ✕
            </AppText>
          </Pressable>
        </View>

        {step === 1 ? (
          <>
            <AppText variant="body" tone="muted">
              Enter your email or username. If you&rsquo;ve set a security question, we&rsquo;ll ask
              it next.
            </AppText>
            <TextField
              label="Email or username"
              placeholder="yourname or you@email.com"
              keyboardType="email-address"
              autoComplete="username"
              value={identifier}
              onChangeText={setIdentifier}
            />
            {error ? (
              <AppText variant="body" color={t.semantic.red} style={{ fontSize: 12 }}>
                {error}
              </AppText>
            ) : null}
            <Button
              label="Continue"
              variant="primary"
              loading={loading}
              onPress={onContinue}
              style={{ marginTop: t.spacing.xs }}
            />
          </>
        ) : (
          <>
            <View style={{ gap: 6 }}>
              <AppText variant="label">Security question</AppText>
              <View
                style={{
                  backgroundColor: t.colors.hair,
                  borderRadius: t.radius.chip,
                  paddingHorizontal: t.spacing.md,
                  paddingVertical: 12,
                }}
              >
                <AppText variant="bodySemi">{question}</AppText>
              </View>
            </View>

            <TextField
              label="Your answer"
              placeholder="Your answer"
              autoComplete="off"
              value={answer}
              onChangeText={setAnswer}
            />

            <View style={{ gap: t.spacing.sm }}>
              <TextField
                label="New password"
                placeholder="Create a strong one"
                password
                value={password}
                onChangeText={setPassword}
              />
              <PasswordChecklist value={password} />
            </View>

            {error ? (
              <AppText variant="body" color={t.semantic.red} style={{ fontSize: 12 }}>
                {error}
              </AppText>
            ) : null}

            <Button
              label="Reset password"
              variant="candy"
              candyColor={t.candy.coral}
              loading={loading}
              onPress={onReset}
              style={{ marginTop: t.spacing.xs }}
            />
          </>
        )}
      </ScrollView>
    </BottomSheet>
  );
}
