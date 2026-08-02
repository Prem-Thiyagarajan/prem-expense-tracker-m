import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { ForgotPasswordSheet } from '@/components/ForgotPasswordSheet';
import { AppText, Button, Screen, TextField, useToast } from '@/components/ui';
import { Surface } from '@/components/ui/Surface';
import { apiErrorMessage } from '@/lib/apiError';
import { useTheme } from '@/theme';

export default function LoginScreen() {
  const t = useTheme();
  const router = useRouter();
  const toast = useToast();
  const { signIn } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotVisible, setForgotVisible] = useState(false);

  const onSubmit = async () => {
    if (!identifier.trim() || !password) {
      toast.show('Enter your email/username and password');
      return;
    }
    setLoading(true);
    try {
      await signIn(identifier.trim(), password, remember);
      // The route guard redirects to the app on success.
    } catch (e) {
      toast.show(apiErrorMessage(e, 'Could not log in'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen tabBarInset={false}>
      <View style={{ gap: t.spacing.lg, paddingTop: t.spacing.xl }}>
        <Surface
          backgroundColor={t.candy.yellow}
          offset={t.shadowOffset.chip}
          radius={t.radius.chip}
          style={{
            width: 56,
            height: 56,
            alignItems: 'center',
            justifyContent: 'center',
            transform: [{ rotate: '-6deg' }],
          }}
        >
          <AppText style={{ fontSize: 28 }}>💸</AppText>
        </Surface>

        <View style={{ gap: 4 }}>
          <AppText variant="hero" style={{ fontSize: 30 }}>
            Welcome back!
          </AppText>
          <AppText variant="body" tone="muted">
            Log in to your ExpenseTracker.
          </AppText>
        </View>

        <TextField
          label="Email or username"
          placeholder="you@email.com"
          keyboardType="email-address"
          autoComplete="username"
          value={identifier}
          onChangeText={setIdentifier}
        />

        <TextField
          label="Password"
          placeholder="Your password"
          password
          value={password}
          onChangeText={setPassword}
        />

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Pressable
            onPress={() => setRemember((r) => !r)}
            hitSlop={6}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
          >
            <Surface
              backgroundColor={remember ? t.candy.mint : t.colors.card}
              offset={0}
              radius={6}
              borderWidth={t.border.row}
              style={{ width: 22, height: 22, alignItems: 'center', justifyContent: 'center' }}
            >
              {remember ? (
                <AppText variant="subheading" color={t.candyText} style={{ fontSize: 13 }}>
                  ✓
                </AppText>
              ) : null}
            </Surface>
            <AppText variant="bodyMedium">Remember me (7 days)</AppText>
          </Pressable>

          <Pressable onPress={() => setForgotVisible(true)} hitSlop={6}>
            <AppText variant="link">Forgot?</AppText>
          </Pressable>
        </View>

        <Button label="Log in" variant="primary" loading={loading} onPress={onSubmit} />

        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: t.spacing.sm }}>
          <AppText variant="body" tone="muted">
            New here?
          </AppText>
          <Pressable onPress={() => router.push('/register')} hitSlop={6}>
            <AppText variant="link">Create an account</AppText>
          </Pressable>
        </View>
      </View>

      <ForgotPasswordSheet
        visible={forgotVisible}
        onClose={() => setForgotVisible(false)}
        initialIdentifier={identifier}
        onResetSuccess={(id) => {
          setIdentifier(id);
          toast.show('Password reset ✓ — log in');
        }}
      />
    </Screen>
  );
}
