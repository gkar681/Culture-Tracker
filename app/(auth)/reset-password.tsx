import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';

import { AuthLogo } from '@/components/auth-logo';
import { ThemedTextInput } from '@/components/themed-text-input';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { session, loading, endPasswordRecovery } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    if (!password || !confirm) {
      setError('Enter and confirm your new password.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    endPasswordRecovery();
    router.replace('/(app)/(tabs)/home');
  };

  if (loading) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText>Loading…</ThemedText>
      </ThemedView>
    );
  }

  if (!session) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.logoSection}>
          <AuthLogo />
        </View>
        <View style={styles.mainSection}>
          <ThemedText type="title">Open the link from your email</ThemedText>
          <ThemedText>
            This screen is for finishing a password reset. Open the reset link on this device so the app can sign you
            in briefly, then choose a new password.
          </ThemedText>
          <ThemedText style={styles.hint}>
            If the email opens a blank page at localhost, change Supabase Auth → Site URL away from localhost and add
            your app redirect URL to Redirect URLs (see CultureTracker docs or team notes).
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.select({ ios: 'padding', android: undefined })}>
      <ThemedView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.logoSection}>
            <AuthLogo />
          </View>
          <View style={styles.mainSection}>
            <ThemedText type="title">Choose a new password</ThemedText>
            <ThemedText>Enter a strong password you haven&apos;t used here before.</ThemedText>
            <ThemedTextInput
              style={styles.input}
              secureTextEntry
              placeholder="New password"
              value={password}
              onChangeText={setPassword}
              editable={!submitting}
            />
            <ThemedTextInput
              style={styles.input}
              secureTextEntry
              placeholder="Confirm new password"
              value={confirm}
              onChangeText={setConfirm}
              editable={!submitting}
            />
            {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}
            <TouchableOpacity style={styles.primaryButton} onPress={handleSubmit} disabled={submitting}>
              <ThemedText type="defaultSemiBold">{submitting ? 'Updating…' : 'Update password'}</ThemedText>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  hint: {
    opacity: 0.85,
    fontSize: 13,
    lineHeight: 18,
  },
  scroll: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  logoSection: {
    paddingTop: 16,
    alignItems: 'center',
  },
  mainSection: {
    flex: 1,
    paddingTop: 28,
    gap: 16,
  },
  input: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
  },
  errorText: {
    color: 'red',
  },
  primaryButton: {
    marginTop: 8,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
  },
});

