import { StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">CultureTracker</ThemedText>
      <ThemedText>
        Quick actions to start logging in seconds.
      </ThemedText>

      <TouchableOpacity style={styles.button} onPress={() => router.push('/(app)/onboarding')}>
        <ThemedText type="defaultSemiBold">Start walkthrough</ThemedText>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={() => router.push('/(app)/cell-line/new')}>
        <ThemedText type="defaultSemiBold">Add new cell line</ThemedText>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={() => router.push('/(app)/experiment/new')}>
        <ThemedText type="defaultSemiBold">Create new experiment</ThemedText>
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

