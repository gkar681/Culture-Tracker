import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Link } from 'expo-router';
import * as Linking from 'expo-linking';

import { AuthLogo } from '@/components/auth-logo';
import { ThemedTextInput } from '@/components/themed-text-input';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { supabase } from '@/lib/supabase';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    setError(null);
    const trimmed = email.trim();
    if (!trimmed) {
      setError('Enter your email address.');
      return;
    }
    setSubmitting(true);
    // Use app scheme so Supabase emails can open the app (add this exact URL in Supabase → Auth → Redirect URLs).
    const redirectTo = Linking.createURL('reset-password', { scheme: 'culturetracker' });
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmed, { redirectTo });
    setSubmitting(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setSent(true);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.select({ ios: 'padding', android: undefined })}>
      <ThemedView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.logoSection}>
            <AuthLogo />
          </View>
          <View style={styles.mainSection}>
            <ThemedText type="title">Reset your password</ThemedText>
            {!sent ? (
              <>
                <ThemedText>
                  Enter the email you use for CultureTracker and we&apos;ll send a link to choose a new password.
                </ThemedText>
                <ThemedTextInput
                  style={styles.input}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholder="you@example.com"
                  value={email}
                  onChangeText={setEmail}
                  editable={!submitting}
                />
                {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}
                <TouchableOpacity style={styles.primaryButton} onPress={handleSend} disabled={submitting}>
                  <ThemedText type="defaultSemiBold">
                    {submitting ? 'Sending…' : 'Send reset link'}
                  </ThemedText>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <ThemedText>
                  If an account exists for that email, you&apos;ll receive a message with a reset link in the next few
                  minutes.
                </ThemedText>
                <ThemedText>Check your inbox and spam folder, then follow the link.</ThemedText>
              </>
            )}
            <View style={styles.linkWrap}>
              <Link href="/login">
                <ThemedText type="link" style={styles.linkText}>
                  Back to sign in
                </ThemedText>
              </Link>
            </View>
          </View>
        </ScrollView>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
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
  linkWrap: {
    alignItems: 'center',
    marginTop: 12,
  },
  linkText: {
    textAlign: 'center',
  },
});

