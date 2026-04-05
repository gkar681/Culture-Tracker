import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';

import { ThemedTextInput } from '@/components/themed-text-input';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useProfile, useUpdateProfile } from '@/hooks/use-profile';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useAuth } from '@/lib/auth';
import { resetOnboarding } from '@/lib/onboarding';

export default function ProfileScreen() {
  const tint = useThemeColor({}, 'tint');
  const borderHairline = useThemeColor({}, 'icon');
  const { user } = useAuth();
  const { data: profile, isLoading, isError, error, refetch } = useProfile();
  const updateProfile = useUpdateProfile();

  const [name, setName] = useState('');
  const [labName, setLabName] = useState('');
  const [bio, setBio] = useState('');

  useEffect(() => {
    if (!profile) return;
    setName(profile.display_name ?? '');
    setLabName(profile.lab_name ?? '');
    setBio(profile.bio ?? '');
  }, [profile]);

  const handleSave = () => {
    updateProfile.mutate({
      display_name: name,
      lab_name: labName,
      bio,
    });
  };

  const dirty =
    name !== (profile?.display_name ?? '') ||
    labName !== (profile?.lab_name ?? '') ||
    bio !== (profile?.bio ?? '');

  const canSave = dirty && !updateProfile.isPending;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.select({ ios: 'padding', android: undefined })}>
      <ThemedView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <ThemedText type="title">Profile</ThemedText>
          {user?.email ? (
            <ThemedText style={styles.email} selectable>
              {user.email}
            </ThemedText>
          ) : null}

          {isLoading ? (
            <View style={styles.centerRow}>
              <ActivityIndicator />
              <ThemedText style={styles.muted}>Loading profile…</ThemedText>
            </View>
          ) : isError ? (
            <View style={styles.block}>
              <ThemedText style={styles.errorText}>{(error as Error).message}</ThemedText>
              <ThemedText style={styles.hint}>
                If this mentions a missing column, run the SQL in supabase/migrations for profile fields, then pull to
                refresh.
              </ThemedText>
              <TouchableOpacity
                onPress={() => refetch()}
                style={[styles.secondaryBtn, { borderColor: borderHairline }]}>
                <ThemedText type="defaultSemiBold">Try again</ThemedText>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.field}>
                <ThemedText type="defaultSemiBold">Your name</ThemedText>
                <ThemedTextInput
                  style={styles.input}
                  placeholder="e.g. Alex Chen"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>
              <View style={styles.field}>
                <ThemedText type="defaultSemiBold">Lab name</ThemedText>
                <ThemedTextInput
                  style={styles.input}
                  placeholder="e.g. Smith Lab"
                  value={labName}
                  onChangeText={setLabName}
                  autoCapitalize="words"
                />
              </View>
              <View style={styles.field}>
                <ThemedText type="defaultSemiBold">Description</ThemedText>
                <ThemedText style={styles.subtle}>Optional — role, research focus, or notes.</ThemedText>
                <ThemedTextInput
                  style={[styles.input, styles.multiline]}
                  placeholder="Short description…"
                  value={bio}
                  onChangeText={setBio}
                  multiline
                  textAlignVertical="top"
                  numberOfLines={4}
                />
              </View>

              {updateProfile.isError ? (
                <ThemedText style={styles.errorText}>{(updateProfile.error as Error).message}</ThemedText>
              ) : null}

              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  { borderColor: tint },
                  !canSave && styles.primaryBtnDisabled,
                ]}
                onPress={handleSave}
                disabled={!canSave}>
                <ThemedText type="defaultSemiBold">{updateProfile.isPending ? 'Saving…' : 'Save'}</ThemedText>
              </TouchableOpacity>
            </>
          )}

          <View style={[styles.divider, { backgroundColor: borderHairline }]} />

          <TouchableOpacity
            style={[styles.secondaryBtn, { borderColor: borderHairline }]}
            onPress={async () => {
              await resetOnboarding();
            }}>
            <ThemedText type="defaultSemiBold">Replay walkthrough</ThemedText>
          </TouchableOpacity>
        </ScrollView>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 32, gap: 14 },
  email: { opacity: 0.75, marginBottom: 4 },
  centerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 12 },
  muted: { opacity: 0.7 },
  block: { gap: 10 },
  field: { gap: 6 },
  subtle: { fontSize: 13, opacity: 0.75 },
  input: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
  },
  multiline: { minHeight: 100, paddingTop: 12 },
  primaryBtn: {
    marginTop: 8,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 2,
  },
  primaryBtnDisabled: { opacity: 0.45 },
  secondaryBtn: {
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  divider: { height: 1, marginVertical: 16, opacity: 0.25 },
  errorText: { color: 'red' },
  hint: { fontSize: 13, lineHeight: 18, opacity: 0.85 },
});
