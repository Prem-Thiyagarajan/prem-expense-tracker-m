import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { isPasswordValid, PasswordChecklist } from '@/components/PasswordChecklist';
import { AppText, Button, Screen, TextField, useToast } from '@/components/ui';
import { useTheme } from '@/theme';

function apiErrorMessage(e: unknown, fallback: string): string {
  const detail = (e as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  // FastAPI validation errors come back as an array of {msg}.
  if (Array.isArray(detail) && detail[0]?.msg) return String(detail[0].msg);
  return fallback;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterScreen() {
  const t = useTheme();
  const router = useRouter();
  const toast = useToast();
  const { register } = useAuth();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (!username.trim()) return toast.show('Choose a username');
    if (!EMAIL_RE.test(email.trim())) return toast.show('Enter a valid email');
    if (!isPasswordValid(password)) return toast.show('Password does not meet all rules');
    if (password !== confirm) return toast.show('Passwords do not match');

    setLoading(true);
    try {
      await register({ username: username.trim(), email: email.trim(), password });
      toast.show('Account created — please log in ✓');
      router.replace('/login');
    } catch (e) {
      toast.show(apiErrorMessage(e, 'Could not create account'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen tabBarInset={false}>
      <View style={{ gap: t.spacing.lg, paddingTop: t.spacing.xl }}>
        <View style={{ gap: 4 }}>
          <AppText variant="hero" style={{ fontSize: 30 }}>
            Create account
          </AppText>
          <AppText variant="body" tone="muted">
            Start tracking in your Pocket.
          </AppText>
        </View>

        <TextField
          label="Username"
          placeholder="yourname"
          autoComplete="username-new"
          value={username}
          onChangeText={setUsername}
        />
        <TextField
          label="Email"
          placeholder="you@email.com"
          keyboardType="email-address"
          autoComplete="email"
          value={email}
          onChangeText={setEmail}
        />
        <View style={{ gap: t.spacing.sm }}>
          <TextField
            label="Password"
            placeholder="Create a strong password"
            password
            value={password}
            onChangeText={setPassword}
          />
          <PasswordChecklist value={password} />
        </View>
        <TextField
          label="Confirm password"
          placeholder="Repeat your password"
          password
          value={confirm}
          onChangeText={setConfirm}
          error={confirm.length > 0 && confirm !== password ? 'Passwords do not match' : undefined}
        />

        <Button label="Register" variant="candy" candyColor={t.candy.coral} loading={loading} onPress={onSubmit} />

        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: t.spacing.sm }}>
          <AppText variant="body" tone="muted">
            Already have an account?
          </AppText>
          <Pressable onPress={() => router.replace('/login')} hitSlop={6}>
            <AppText variant="link">Log in</AppText>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}
