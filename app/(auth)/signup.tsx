import { Link, useRouter } from 'expo-router';
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
import { supabase } from '@/lib/supabase';
import { useColorScheme } from '@/hooks/use-color-scheme';

type Step = 'form' | 'success';

export default function SignupScreen() {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>('form');

  const handleSignup = async () => {
    setError(null);
    if (!email.trim() || !password.trim()) {
      setError('Please fill in both email and password.');
      return;
    }
    setSubmitting(true);
    const { error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password: password.trim(),
      options: {
        emailRedirectTo: undefined,
      },
    });
    setSubmitting(false);
    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    setStep('success');
  };

  const cardBorderColor = scheme === 'dark' ? '#2D2D2D' : '#E6DCCF';
  const innerCardBg = scheme === 'dark' ? '#252320' : '#FAF7F2';
  const innerCardBorderColor = scheme === 'dark' ? '#3B3834' : '#E6DCCF';

  if (step === 'success') {
    return (
      <ThemedView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.logoSection}>
            <AuthLogo />
          </View>
          <ThemedView style={[styles.card, { borderColor: cardBorderColor }]} lightColor="#FFFFFF" darkColor="#1C1A17">
            <ThemedText type="title" style={styles.title}>Activate Account</ThemedText>
            <ThemedText style={styles.successBody}>
              We sent a message to{' '}
              <ThemedText type="defaultSemiBold">{email.trim()}</ThemedText>. Open the verification link in that email to activate your account.
            </ThemedText>
            
            <View style={[styles.successStepsCard, { backgroundColor: innerCardBg, borderColor: innerCardBorderColor }]}>
              <ThemedText style={styles.successStep}>1. Check your inbox (and spam folder)</ThemedText>
              <ThemedText style={styles.successStep}>2. Tap the confirmation link</ThemedText>
              <ThemedText style={styles.successStep}>3. Sign in below with your password</ThemedText>
            </View>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.replace('/login')}
              accessibilityRole="button"
              accessibilityLabel="Go to sign in"
              activeOpacity={0.85}
            >
              <ThemedText type="defaultSemiBold" lightColor="#FFFFFF">Go to sign in</ThemedText>
            </TouchableOpacity>
            
            <TouchableOpacity onPress={() => setStep('form')} activeOpacity={0.7} style={styles.linkWrap}>
              <ThemedText type="link" style={styles.linkText}>
                Use a different email
              </ThemedText>
            </TouchableOpacity>
          </ThemedView>
        </ScrollView>
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
          <ThemedView style={[styles.card, { borderColor: cardBorderColor }]} lightColor="#FFFFFF" darkColor="#1C1A17">
            <ThemedText type="title" style={styles.title}>Create account</ThemedText>
            <ThemedText style={styles.subtitle}>Sign up to start tracking your lab experiments</ThemedText>

            <View style={styles.form}>
              <View style={styles.field}>
                <ThemedText type="defaultSemiBold" style={styles.label}>Email Address</ThemedText>
                <ThemedTextInput
                  style={styles.input}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholder="you@example.com"
                  value={email}
                  onChangeText={setEmail}
                  editable={!submitting}
                />
              </View>

              <View style={styles.field}>
                <ThemedText type="defaultSemiBold" style={styles.label}>Password</ThemedText>
                <ThemedTextInput
                  style={styles.input}
                  secureTextEntry
                  placeholder="••••••••"
                  value={password}
                  onChangeText={setPassword}
                  editable={!submitting}
                />
              </View>

              {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}

              <TouchableOpacity 
                style={styles.primaryButton} 
                onPress={handleSignup} 
                disabled={submitting}
                activeOpacity={0.85}
              >
                <ThemedText type="defaultSemiBold" lightColor="#FFFFFF">
                  {submitting ? 'Creating account…' : 'Sign up'}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </ThemedView>

          <View style={styles.linkWrap}>
            <Link href="/login">
              <ThemedText type="link" style={styles.linkText}>
                Already have an account? Log in
              </ThemedText>
            </Link>
          </View>
        </ScrollView>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
    gap: 20,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: -16,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    gap: 16,
    shadowColor: '#340D0E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  title: {
    fontSize: 28,
    lineHeight: 32,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#8C7B70',
    textAlign: 'center',
    marginTop: -8,
    marginBottom: 4,
  },
  form: {
    gap: 14,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 13,
  },
  input: {
    marginVertical: 0,
  },
  errorText: {
    color: '#D97706',
    fontSize: 13,
    textAlign: 'center',
  },
  primaryButton: {
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#340D0E',
    marginTop: 6,
    shadowColor: '#340D0E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 2,
  },
  linkWrap: {
    alignItems: 'center',
    marginTop: 10,
  },
  linkText: {
    fontSize: 14,
    textAlign: 'center',
  },
  successBody: {
    textAlign: 'center',
    lineHeight: 22,
    color: '#8C7B70',
    fontSize: 14,
  },
  successStepsCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    gap: 10,
  },
  successStep: {
    fontSize: 13,
    lineHeight: 18,
  },
});
