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
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
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

  const cardBorderColor = scheme === 'dark' ? '#2D2D2D' : '#E6DCCF';
  const innerCardBg = scheme === 'dark' ? '#252320' : '#FAF7F2';
  const innerCardBorderColor = scheme === 'dark' ? '#3B3834' : '#E6DCCF';

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
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.logoSection}>
            <AuthLogo />
          </View>
          <ThemedView style={[styles.card, { borderColor: cardBorderColor }]} lightColor="#FFFFFF" darkColor="#1C1A17">
            <ThemedText type="title" style={styles.title}>Recovery Link Required</ThemedText>
            <ThemedText style={styles.bodyText}>
              This screen is for finishing a password reset. Open the reset link on this device so the app can verify you briefly, then choose a new password.
            </ThemedText>
            <View style={[styles.infoBox, { backgroundColor: innerCardBg, borderColor: innerCardBorderColor }]}>
              <ThemedText style={styles.infoText}>
                If the email opens a blank page, make sure the Site URL configuration in your Supabase Auth dashboard matches this device's host or deep link scheme.
              </ThemedText>
            </View>
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
            <ThemedText type="title" style={styles.title}>New Password</ThemedText>
            <ThemedText style={styles.subtitle}>Enter a strong password you haven't used here before.</ThemedText>
            
            <View style={styles.form}>
              <View style={styles.field}>
                <ThemedText type="defaultSemiBold" style={styles.label}>New Password</ThemedText>
                <ThemedTextInput
                  style={styles.input}
                  secureTextEntry
                  placeholder="••••••••"
                  value={password}
                  onChangeText={setPassword}
                  editable={!submitting}
                />
              </View>

              <View style={styles.field}>
                <ThemedText type="defaultSemiBold" style={styles.label}>Confirm New Password</ThemedText>
                <ThemedTextInput
                  style={styles.input}
                  secureTextEntry
                  placeholder="••••••••"
                  value={confirm}
                  onChangeText={setConfirm}
                  editable={!submitting}
                />
              </View>

              {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}

              <TouchableOpacity 
                style={styles.primaryButton} 
                onPress={handleSubmit} 
                disabled={submitting}
                activeOpacity={0.85}
              >
                <ThemedText type="defaultSemiBold" lightColor="#FFFFFF">
                  {submitting ? 'Updating…' : 'Update password'}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </ThemedView>
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
  bodyText: {
    fontSize: 14,
    color: '#8C7B70',
    textAlign: 'center',
    lineHeight: 20,
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
  infoBox: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
  },
  infoText: {
    fontSize: 12,
    color: '#8C7B70',
    lineHeight: 18,
    textAlign: 'center',
  },
});
