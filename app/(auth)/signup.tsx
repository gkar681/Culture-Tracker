import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Link, useRouter } from 'expo-router';

import { AuthLogo } from '@/components/auth-logo';
import { ThemedTextInput } from '@/components/themed-text-input';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { supabase } from '@/lib/supabase';

type Step = 'form' | 'check_email';

export default function SignupScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('form');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignup = async () => {
    setSubmitting(true);
    setError(null);
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError('Enter email and password.');
      setSubmitting(false);
      return;
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
    });

    if (signUpError) {
      setError(signUpError.message);
      setSubmitting(false);
      return;
    }

    setSubmitting(false);

    // Logged in immediately (email confirmation disabled in Supabase).
    if (data.session) {
      router.replace('/(app)/(tabs)/home');
      return;
    }

    // Account created but must confirm email first.
    setStep('check_email');
  };

  if (step === 'check_email') {
    return (
      <ThemedView style={styles.container}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollSuccess}
          showsVerticalScrollIndicator={false}>
          <View style={styles.logoSection}>
            <AuthLogo />
          </View>
          <View style={styles.successBlock}>
            <ThemedText type="title" style={styles.successTitle}>
              Next step: confirm your email
            </ThemedText>
            <ThemedText style={styles.successBody}>
              We sent a message to{' '}
              <ThemedText type="defaultSemiBold">{email.trim()}</ThemedText>. Open the link in that email to
              activate your account.
            </ThemedText>
            <ThemedText style={styles.successSteps}>
              1. Open your inbox (and spam folder){'\n'}
              2. Tap the confirmation link{'\n'}
              3. Then sign in below with the password you just chose
            </ThemedText>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.replace('/login')}
              accessibilityRole="button"
              accessibilityLabel="Go to sign in">
              <ThemedText type="defaultSemiBold">Go to sign in</ThemedText>
            </TouchableOpacity>
            <View style={styles.linkWrap}>
              <TouchableOpacity onPress={() => setStep('form')} accessibilityRole="button">
                <ThemedText type="link" style={styles.linkText}>
                  Use a different email
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </ThemedView>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.select({ ios: 'padding', android: undefined })}>
      <ThemedView style={styles.container}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.logoSection}>
            <AuthLogo />
          </View>
          <View style={styles.mainSection}>
            <ThemedText type="title">Create your account</ThemedText>
            <ThemedTextInput
              style={styles.input}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              editable={!submitting}
            />
            <ThemedTextInput
              style={styles.input}
              secureTextEntry
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              editable={!submitting}
            />
            {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}
            <TouchableOpacity style={styles.primaryButton} onPress={handleSignup} disabled={submitting}>
              <ThemedText type="defaultSemiBold">{submitting ? 'Creating account…' : 'Sign up'}</ThemedText>
            </TouchableOpacity>
            <View style={styles.linkWrap}>
              <Link href="/login">
                <ThemedText type="link" style={styles.linkText}>
                  Already have an account? Log in
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
  scrollSuccess: {
    flexGrow: 1,
    paddingBottom: 32,
  },
  logoSection: {
    paddingTop: 16,
    alignItems: 'center',
  },
  mainSection: {
    flex: 1,
    justifyContent: 'flex-start',
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
  },
  linkText: {
    textAlign: 'center',
  },
  successBlock: {
    paddingTop: 24,
    gap: 16,
  },
  successTitle: {
    textAlign: 'center',
  },
  successBody: {
    textAlign: 'center',
    lineHeight: 22,
  },
  successSteps: {
    lineHeight: 24,
    opacity: 0.9,
  },
});
