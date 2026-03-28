import { StyleSheet, TouchableOpacity } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { resetOnboarding } from '@/lib/onboarding';

export default function SettingsScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Settings</ThemedText>
      <ThemedText>
        This screen will hold account settings, notification preferences, and debug tools during development.
      </ThemedText>
      <TouchableOpacity
        style={styles.button}
        onPress={async () => {
          await resetOnboarding();
        }}>
        <ThemedText type="defaultSemiBold">Replay walkthrough</ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  button: {
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
});

