import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';

import { AuthLogo } from '@/components/auth-logo';
import { ThemedTextInput } from '@/components/themed-text-input';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { supabase } from '@/lib/supabase';

export default function LoginScreen() {
  const router = useRouter();
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

  return (
    <ThemedView style={styles.container}>
      <View style={styles.logoSection}>
        <AuthLogo />
      </View>
      <View style={styles.mainSection}>
        <ThemedText type="title">Welcome back</ThemedText>
        <ThemedTextInput
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="you@example.com"
          value={email}
          onChangeText={setEmail}
        />
        <ThemedTextInput
          style={styles.input}
          secureTextEntry
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
        />
        <View style={styles.forgotWrap}>
          <Link href="/forgot-password">
            <ThemedText type="link" style={styles.forgotText}>
              Forgot password?
            </ThemedText>
          </Link>
        </View>
        {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}
        <TouchableOpacity style={styles.primaryButton} onPress={handleLogin} disabled={submitting}>
          <ThemedText type="defaultSemiBold">{submitting ? 'Logging in…' : 'Log in'}</ThemedText>
        </TouchableOpacity>
        <View style={styles.linkWrap}>
          <Link href="/signup">
            <ThemedText type="link" style={styles.linkText}>
              Need an account? Sign up
            </ThemedText>
          </Link>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
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
    paddingBottom: 24,
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
  forgotWrap: {
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  forgotText: {
    fontSize: 14,
  },
  linkWrap: {
    alignItems: 'center',
  },
  linkText: {
    textAlign: 'center',
  },
});

