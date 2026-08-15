import { Link } from 'expo-router';
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

export default function ForgotPasswordScreen() {
  const scheme = useColorScheme() ?? 'light';
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSend = async () => {
    setError(null);
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    setSubmitting(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: undefined,
    });
    setSubmitting(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setSuccess(true);
  };

  const cardBorderColor = scheme === 'dark' ? '#2D2D2D' : '#E6DCCF';

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.select({ ios: 'padding', android: undefined })}>
      <ThemedView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.logoSection}>
            <AuthLogo />
          </View>
          <ThemedView style={[styles.card, { borderColor: cardBorderColor }]} lightColor="#FFFFFF" darkColor="#1C1A17">
            <ThemedText type="title" style={styles.title}>Reset Password</ThemedText>
            
            {!success ? (
              <>
                <ThemedText style={styles.subtitle}>
                  We will send you an email containing a link to choose a new password.
                </ThemedText>
                
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

                  {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}

                  <TouchableOpacity 
                    style={styles.primaryButton} 
                    onPress={handleSend} 
                    disabled={submitting}
                    activeOpacity={0.85}
                  >
                    <ThemedText type="defaultSemiBold" lightColor="#FFFFFF">
                      {submitting ? 'Sending…' : 'Send reset link'}
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <View style={styles.successBlock}>
                <ThemedText style={styles.successBody}>
                  If an account exists for {email.trim()}, you will receive a reset link shortly.
                </ThemedText>
                <ThemedText style={styles.successSub}>
                  Please check your inbox and spam folder, then open the link on this device to proceed.
                </ThemedText>
              </View>
            )}
          </ThemedView>

          <View style={styles.linkWrap}>
            <Link href="/login">
              <ThemedText type="link" style={styles.linkText}>
                Back to log in
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
    lineHeight: 18,
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
  successBlock: {
    gap: 10,
    paddingVertical: 8,
  },
  successBody: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '600',
  },
  successSub: {
    fontSize: 13,
    color: '#8C7B70',
    textAlign: 'center',
    lineHeight: 18,
  },
});
