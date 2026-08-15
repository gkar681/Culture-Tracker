import { StyleSheet, TouchableOpacity, View, ScrollView } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';

import { AuthLogo } from '@/components/auth-logo';
import { ThemedTextInput } from '@/components/themed-text-input';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { supabase } from '@/lib/supabase';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function LoginScreen() {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setSubmitting(true);
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError(signInError.message);
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    router.replace('/(app)/(tabs)/home');
  };

  const cardBorderColor = scheme === 'dark' ? '#2D2D2D' : '#E6DCCF';

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.logoSection}>
          <AuthLogo />
        </View>
        <ThemedView style={[styles.card, { borderColor: cardBorderColor }]} lightColor="#FFFFFF" darkColor="#1C1A17">
          <ThemedText type="title" style={styles.title}>Welcome back</ThemedText>
          <ThemedText style={styles.subtitle}>Enter your credentials to access your lab notes</ThemedText>
          
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

            <View style={styles.forgotWrap}>
              <Link href="/forgot-password">
                <ThemedText type="link" style={styles.forgotText}>
                  Forgot password?
                </ThemedText>
              </Link>
            </View>

            {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}

            <TouchableOpacity 
              style={styles.primaryButton} 
              onPress={handleLogin} 
              disabled={submitting} 
              activeOpacity={0.85}
            >
              <ThemedText type="defaultSemiBold" lightColor="#FFFFFF">
                {submitting ? 'Logging in…' : 'Log in'}
              </ThemedText>
            </TouchableOpacity>
          </View>
        </ThemedView>

        <View style={styles.linkWrap}>
          <Link href="/signup">
            <ThemedText type="link" style={styles.linkText}>
              Need an account? Sign up
            </ThemedText>
          </Link>
        </View>
      </ScrollView>
    </ThemedView>
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
  forgotWrap: {
    alignSelf: 'flex-end',
  },
  forgotText: {
    fontSize: 13,
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
  },
});
