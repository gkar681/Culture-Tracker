import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  Image,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { ThemedTextInput } from '@/components/themed-text-input';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useProfile, useUpdateProfile } from '@/hooks/use-profile';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useAuth } from '@/lib/auth';
import { resetOnboarding } from '@/lib/onboarding';

const PRESET_AVATARS = [
  {
    key: 'dna',
    name: 'DNA Double Helix',
    source: require('@/assets/images/avatar_dna.jpg'),
  },
  {
    key: 'flask',
    name: 'Lab Flask',
    source: require('@/assets/images/avatar_flask.jpg'),
  },
  {
    key: 'microscope',
    name: 'Microscope Focus',
    source: require('@/assets/images/avatar_microscope.jpg'),
  },
];

export default function ProfileScreen() {
  const tint = useThemeColor({}, 'tint');
  const borderHairline = useThemeColor({}, 'icon');
  const { user } = useAuth();
  const { data: profile, isLoading, isError, error, refetch } = useProfile();
  const updateProfile = useUpdateProfile();

  const [name, setName] = useState('');
  const [labName, setLabName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [selectedPresetKey, setSelectedPresetKey] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    setName(profile.display_name ?? '');
    setLabName(profile.lab_name ?? '');
    setBio(profile.bio ?? '');
  }, [profile]);

  useEffect(() => {
    // Load persisted avatar URI or preset key on mount
    AsyncStorage.getItem('profile_avatar_uri').then((val) => {
      if (val) {
        if (['dna', 'flask', 'microscope'].includes(val)) {
          setSelectedPresetKey(val);
          setAvatarUri(null);
        } else {
          setAvatarUri(val);
          setSelectedPresetKey(null);
        }
      }
    });
  }, []);

  const handlePickPhoto = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'image/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const pickedUri = result.assets[0].uri;
        setAvatarUri(pickedUri);
        setSelectedPresetKey(null);
        await AsyncStorage.setItem('profile_avatar_uri', pickedUri);
      }
    } catch (e) {
      console.warn('Failed to pick profile image', e);
    }
  };

  const handleSelectPreset = async (key: string) => {
    setSelectedPresetKey(key);
    setAvatarUri(null);
    await AsyncStorage.setItem('profile_avatar_uri', key);
  };

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

          {/* Avatar Photo Section */}
          <View style={styles.avatarSection}>
            <TouchableOpacity onPress={handlePickPhoto} style={styles.avatarContainer} activeOpacity={0.8}>
              {selectedPresetKey ? (
                <Image 
                  source={PRESET_AVATARS.find((p) => p.key === selectedPresetKey)?.source} 
                  style={styles.avatar} 
                />
              ) : avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: borderHairline }]}>
                  <MaterialIcons name="person" size={50} color="#FAF7F2" />
                </View>
              )}
              <View style={styles.cameraIconContainer}>
                <MaterialIcons name="photo-camera" size={14} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
            <ThemedText style={styles.avatarLabel}>Tap avatar to upload custom photo</ThemedText>

            <ThemedText style={styles.presetsTitle}>Or choose a fun lab icon preset:</ThemedText>
            <View style={styles.presetsRow}>
              {PRESET_AVATARS.map((preset) => (
                <TouchableOpacity
                  key={preset.key}
                  onPress={() => handleSelectPreset(preset.key)}
                  style={[
                    styles.presetItem,
                    selectedPresetKey === preset.key && styles.presetItemActive,
                  ]}
                  activeOpacity={0.8}
                >
                  <Image source={preset.source} style={styles.presetImage} />
                </TouchableOpacity>
              ))}
            </View>
          </View>

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
                  { backgroundColor: '#340D0E', borderColor: '#340D0E' },
                  !canSave && styles.primaryBtnDisabled,
                ]}
                onPress={handleSave}
                disabled={!canSave}
                activeOpacity={0.85}
              >
                <ThemedText type="defaultSemiBold" lightColor="#FFFFFF">{updateProfile.isPending ? 'Saving…' : 'Save'}</ThemedText>
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
    borderWidth: 1,
    shadowColor: '#340D0E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 2,
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
  
  // Avatar Styles
  avatarSection: {
    alignItems: 'center',
    marginVertical: 10,
    gap: 8,
  },
  avatarContainer: {
    position: 'relative',
    width: 90,
    height: 90,
    borderRadius: 45,
    overflow: 'visible',
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    borderColor: '#340D0E',
  },
  avatarPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: '#340D0E',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FAF7F2',
  },
  avatarLabel: {
    fontSize: 12,
    opacity: 0.75,
  },
  presetsTitle: {
    fontSize: 12,
    marginTop: 6,
    opacity: 0.75,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 2,
  },
  presetItem: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E6DCCF',
    padding: 2,
    backgroundColor: '#FFFFFF',
  },
  presetItemActive: {
    borderColor: '#340D0E',
    borderWidth: 2,
  },
  presetImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
});
