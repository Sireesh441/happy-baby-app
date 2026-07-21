import { Link, Stack, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';

export default function SignupScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { signup } = useAuth();
  const { redirectTo } = useLocalSearchParams<{ redirectTo?: string }>();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);
    setIsSubmitting(true);
    try {
      await signup(name.trim(), email.trim(), password);
      if (redirectTo) {
        router.replace(redirectTo as Href);
      } else {
        router.back();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const canSubmit = name.trim().length > 0 && email.trim().length > 0 && password.length >= 6 && !isSubmitting;

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'Sign Up' }} />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <ThemedText type="title" style={styles.title}>
            Create account
          </ThemedText>
          <ThemedText themeColor="textSecondary">Sign up to check out faster next time.</ThemedText>

          <View style={styles.form}>
            <ThemedView type="backgroundElement" style={styles.inputWrapper}>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Name"
                placeholderTextColor={theme.textSecondary}
                style={[styles.input, { color: theme.text }]}
                autoCorrect={false}
              />
            </ThemedView>
            <ThemedView type="backgroundElement" style={styles.inputWrapper}>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Email"
                placeholderTextColor={theme.textSecondary}
                style={[styles.input, { color: theme.text }]}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
              />
            </ThemedView>
            <ThemedView type="backgroundElement" style={styles.inputWrapper}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Password (min. 6 characters)"
                placeholderTextColor={theme.textSecondary}
                style={[styles.input, { color: theme.text }]}
                secureTextEntry
              />
            </ThemedView>

            {error && <ThemedText style={styles.error}>{error}</ThemedText>}

            <Pressable
              onPress={handleSubmit}
              disabled={!canSubmit}
              accessibilityRole="button"
              accessibilityLabel="Submit signup"
              style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}>
              <ThemedText type="smallBold" style={styles.submitButtonText}>
                {isSubmitting ? 'Creating account...' : 'Sign Up'}
              </ThemedText>
            </Pressable>

            <Link
              href={{ pathname: '/login', params: redirectTo ? { redirectTo } : undefined }}
              style={styles.switchLink}>
              <ThemedText themeColor="textSecondary">
                Already have an account? <ThemedText type="link">Log in</ThemedText>
              </ThemedText>
            </Link>
          </View>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
  },
  title: {
    marginBottom: Spacing.one,
  },
  form: {
    marginTop: Spacing.five,
    gap: Spacing.three,
  },
  inputWrapper: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
  },
  input: {
    fontSize: 16,
    paddingVertical: Spacing.three,
  },
  error: {
    color: '#dc2626',
  },
  submitButton: {
    backgroundColor: '#3c87f7',
    borderRadius: Spacing.five,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    marginTop: Spacing.one,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#ffffff',
  },
  switchLink: {
    alignItems: 'center',
    marginTop: Spacing.two,
  },
});
